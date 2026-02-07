import { getLogger } from '@nimbus/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';
import { type TraceContext, withSpan } from './tracing.ts';

type Bound = {
    id: string;
    type: 'inclusive' | 'exclusive';
};

type ObserveFromLatestEvent = {
    subject: string;
    type: string;
    ifEventIsMissing: 'read-everything' | 'wait-for-event';
};

export type RetryOptions = {
    /**
     * The maximum number of retry attempts before giving up.
     * Defaults to 3.
     */
    maxRetries: number;
    /**
     * The initial delay in milliseconds before the first retry.
     * Subsequent retries will use exponential backoff with jitter.
     * Defaults to 1000ms.
     */
    initialRetryDelayMs: number;
};

/**
 * An event observer defines a handler function which will be applied to each event
 * and the options to observe the events according to the EventSourcingDB API.
 *
 * See https://docs.eventsourcingdb.io/getting-started/observing-events for more information.
 */
export type EventObserver = {
    /**
     * The subject of the events to observe.
     */
    subject: string;
    /**
     * Whether to observe events recursively.
     * Defaults to false.
     */
    recursive?: boolean;
    /**
     * The lower bound of the events to observe.
     * Defaults to undefined.
     */
    lowerBound?: Bound;
    /**
     * The from latest event to observe.
     * Defaults to undefined.
     */
    fromLatestEvent?: ObserveFromLatestEvent;
    /**
     * The event handler which will be called when an event is observed.
     *
     * @param event - The EventSourcingDB event that was observed.
     * @returns A promise that resolves when the event has been handled.
     */
    eventHandler: (event: EventSourcingDBEvent) => Promise<void> | void;
    /**
     * Options for retry behavior when the connection fails.
     * Uses exponential backoff with jitter between retries.
     * Defaults to { maxRetries: 3, initialRetryDelayMs: 3000 }.
     */
    retryOptions?: RetryOptions;
};

/**
 * Returns a promise that resolves after the given number of milliseconds.
 */
const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates an exponential backoff delay with jitter for a given
 * retry attempt. The jitter adds up to 30% of the base delay to
 * avoid thundering-herd effects.
 *
 * @param initialDelayMs - The base delay in milliseconds before
 *   exponential scaling.
 * @param attempt - The zero-based retry attempt number.
 * @returns The backoff delay in milliseconds.
 */
const calculateBackoffDelay = (
    initialDelayMs: number,
    attempt: number,
): number => {
    const baseDelay = initialDelayMs * Math.pow(2, attempt);

    // Add jitter: random value between 0 and 30% of the base delay
    const jitter = Math.random() * baseDelay * 0.3;

    return Math.floor(baseDelay + jitter);
};

/**
 * Logs an informational message when an event observer connects or
 * reconnects to EventSourcingDB. When {@link retryCount} is greater
 * than zero the message indicates a successful reconnection.
 *
 * @param subject - The observed subject.
 * @param retryCount - The number of retries that preceded this
 *   connection (0 for the initial connection).
 * @param data - Additional context logged alongside the message.
 */
const logObserverConnection = (
    subject: string,
    retryCount: number,
    data: Record<string, unknown>,
): void => {
    const message = retryCount > 0
        ? `Reconnected event observer for subject "${subject}" after ${retryCount} ${
            retryCount === 1 ? 'retry' : 'retries'
        }`
        : `Observing events for subject "${subject}"`;

    getLogger().info({ category: 'Nimbus', message, data });
};

/**
 * Handles an observer error by logging it and waiting with exponential
 * backoff before the next retry attempt. When the maximum number of
 * retries is exceeded a critical log entry is emitted and no further
 * retries are attempted.
 *
 * @param error - The error that caused the observer to disconnect.
 * @param subject - The observed subject.
 * @param retryCount - The current (1-based) retry attempt number.
 * @param maxRetries - The maximum number of allowed retries.
 * @param initialRetryDelayMs - The base delay used for exponential
 *   backoff calculation.
 * @returns `true` if the observer should retry, `false` if retries
 *   are exhausted.
 */
const handleObserverError = async (
    error: unknown,
    subject: string,
    retryCount: number,
    maxRetries: number,
    initialRetryDelayMs: number,
): Promise<boolean> => {
    if (retryCount > maxRetries) {
        getLogger().critical({
            category: 'Nimbus',
            message:
                `Failed to observe events for subject "${subject}" after ${maxRetries} ${
                    maxRetries === 1 ? 'retry' : 'retries'
                }.`,
        });
        return false;
    }

    const backoffDelay = calculateBackoffDelay(
        initialRetryDelayMs,
        retryCount - 1,
    );

    getLogger().error({
        category: 'Nimbus',
        message:
            `Error observing events for subject "${subject}" (retry ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`,
        error: error as Error,
    });

    await delay(backoffDelay);
    return true;
};

/**
 * Starts observing events for the given {@link EventObserver} with
 * automatic reconnection on failure.
 *
 * On each connection attempt the EventSourcingDB server is pinged
 * first. Events are then consumed from the stream and each one is
 * passed to the observer's event handler inside an OpenTelemetry
 * span. If the event carries a `traceparent`, the span is linked to
 * the original writer's trace for end-to-end distributed tracing.
 *
 * After every successfully handled event the lower bound is advanced
 * so that a reconnection resumes from the last processed position.
 *
 * When the connection drops, exponential backoff with jitter is
 * applied up to the configured maximum number of retries.
 *
 * @param eventObserver - The event observer configuration.
 */
const observeWithRetry = async (
    eventObserver: EventObserver,
): Promise<void> => {
    const eventSourcingDBClient = getEventSourcingDBClient();

    const maxRetries = eventObserver.retryOptions?.maxRetries ?? 3;
    const initialRetryDelayMs =
        eventObserver.retryOptions?.initialRetryDelayMs ?? 3000;

    let retryCount = 0;
    let lowerBound: Bound | undefined = eventObserver.lowerBound;
    let fromLatestEvent: ObserveFromLatestEvent | undefined =
        eventObserver.fromLatestEvent;

    while (true) {
        try {
            // Verify connection
            await eventSourcingDBClient.ping();

            logObserverConnection(eventObserver.subject, retryCount, {
                recursive: eventObserver.recursive ?? false,
                lowerBound,
                fromLatestEvent,
            });
            retryCount = 0;

            for await (
                const event of eventSourcingDBClient.observeEvents(
                    eventObserver.subject,
                    {
                        recursive: eventObserver.recursive ?? false,
                        ...(lowerBound ? { lowerBound } : {}),
                        ...(fromLatestEvent ? { fromLatestEvent } : {}),
                    },
                )
            ) {
                const traceContext: TraceContext | undefined = event.traceparent
                    ? {
                        traceparent: event.traceparent,
                        tracestate: event.tracestate,
                    }
                    : undefined;

                await withSpan(
                    'observeEvent',
                    async () => {
                        await eventObserver.eventHandler(event);
                    },
                    traceContext,
                );

                // Update lowerBound after each event so retries resume from here
                lowerBound = {
                    id: event.id,
                    type: 'exclusive',
                };
                // Clear fromLatestEvent after first event, as we now have a concrete position
                fromLatestEvent = undefined;
            }

            // If the loop completes normally (stream ended), we're done
            return;
        } catch (error) {
            retryCount++;

            const shouldRetry = await handleObserverError(
                error,
                eventObserver.subject,
                retryCount,
                maxRetries,
                initialRetryDelayMs,
            );

            if (!shouldRetry) {
                return;
            }
        }
    }
};

/**
 * Initializes an event observer by starting the observation loop in
 * the background (non-blocking). The observer will keep running and
 * reconnecting according to its retry options until the stream ends
 * or retries are exhausted.
 *
 * @param eventObserver - The event observer configuration.
 */
export const initEventObserver = (eventObserver: EventObserver): void => {
    observeWithRetry(eventObserver);
};
