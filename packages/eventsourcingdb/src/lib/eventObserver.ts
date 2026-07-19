import {
    calculateBackoffDelay as coreCalculateBackoffDelay,
    getLogger,
    withRetry,
} from '@nimbus-cqrs/core';
import { type Span, SpanStatusCode } from '@opentelemetry/api';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';
import { isEventData } from './eventMapping.ts';
import {
    observerConnectionReconnectsCounter,
    observerConnectionRetryAttemptsCounter,
    observerEventsHandledCounter,
    observerHandlerRetryAttemptsCounter,
    observerHandlingDuration,
    type TraceContext,
    withObserveEventSpan,
} from './tracing.ts';

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
     * The maximum number of retries after the initial attempt
     * before giving up. Defaults to 3 (4 failed attempts total).
     */
    maxRetries: number;
    /**
     * The initial delay in milliseconds before the first retry.
     * Subsequent retries will use exponential backoff with jitter.
     * Defaults to 3000ms.
     */
    initialRetryDelayMs: number;
};

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialRetryDelayMs: 3000,
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
     * Options for retry behavior when the observe stream / connection fails.
     * Uses exponential backoff with jitter between reconnects.
     * Defaults to { maxRetries: 3, initialRetryDelayMs: 3000 }.
     */
    connectionRetryOptions?: RetryOptions;
    /**
     * Options for retry behavior when {@link eventHandler} throws.
     * Handler retries happen in-place without reconnecting the stream.
     * Defaults to { maxRetries: 3, initialRetryDelayMs: 3000 }.
     */
    handlerRetryOptions?: RetryOptions;
    /**
     * @deprecated Use {@link connectionRetryOptions} instead.
     *
     * Options for retry behavior when the observe stream / connection fails.
     * Ignored when {@link connectionRetryOptions} is set.
     */
    retryOptions?: RetryOptions;
    /**
     * Called when {@link eventHandler} keeps failing after all handler
     * retries are exhausted. The event is then skipped and observation
     * continues. When omitted, a critical log entry is emitted instead.
     *
     * @param error - The last error thrown by the handler.
     * @param event - The event that could not be handled.
     */
    onHandlerError?: (
        error: Error,
        event: EventSourcingDBEvent,
    ) => Promise<void> | void;
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
 *
 * @deprecated Import {@link calculateBackoffDelay} from
 *   `@nimbus-cqrs/core` instead. This wrapper keeps the historical
 *   30% jitter default used by EventSourcingDB observers.
 */
export const calculateBackoffDelay = (
    initialDelayMs: number,
    attempt: number,
): number =>
    coreCalculateBackoffDelay(initialDelayMs, attempt, {
        jitterFactor: 0.3,
        maxDelayMs: Infinity,
    });

/**
 * Resolves connection retry options, preferring
 * {@link EventObserver.connectionRetryOptions} over the deprecated
 * {@link EventObserver.retryOptions}.
 */
const resolveConnectionRetryOptions = (
    eventObserver: EventObserver,
): RetryOptions => ({
    maxRetries: eventObserver.connectionRetryOptions?.maxRetries ??
        eventObserver.retryOptions?.maxRetries ??
        DEFAULT_RETRY_OPTIONS.maxRetries,
    initialRetryDelayMs:
        eventObserver.connectionRetryOptions?.initialRetryDelayMs ??
            eventObserver.retryOptions?.initialRetryDelayMs ??
            DEFAULT_RETRY_OPTIONS.initialRetryDelayMs,
});

/**
 * Resolves handler retry options from {@link EventObserver.handlerRetryOptions}.
 */
const resolveHandlerRetryOptions = (
    eventObserver: EventObserver,
): RetryOptions => ({
    maxRetries: eventObserver.handlerRetryOptions?.maxRetries ??
        DEFAULT_RETRY_OPTIONS.maxRetries,
    initialRetryDelayMs:
        eventObserver.handlerRetryOptions?.initialRetryDelayMs ??
            DEFAULT_RETRY_OPTIONS.initialRetryDelayMs,
});

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
    const retryLabel = retryCount === 1 ? 'retry' : 'retries';
    const message = retryCount > 0
        ? `Reconnected event observer for subject "${subject}" after ${retryCount} ${retryLabel}`
        : `Observing events for subject "${subject}"`;

    getLogger().info({ category: 'Nimbus', message, data });
};

/**
 * Handles a connection / stream error by logging it and waiting with
 * exponential backoff before the next reconnect attempt. When the
 * maximum number of retries is exceeded a critical log entry is
 * emitted and no further retries are attempted.
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
const handleConnectionError = async (
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

    observerConnectionRetryAttemptsCounter.add(1, { subject });

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

const recordHandlerMetrics = (
    metricLabels: { subject: string; event_type: string },
    status: 'success' | 'skipped',
    startTime: number,
): void => {
    observerEventsHandledCounter.add(1, { ...metricLabels, status });
    observerHandlingDuration.record(
        (performance.now() - startTime) / 1000,
        metricLabels,
    );
};

/**
 * Invokes the event handler with in-place retries. Does not reconnect
 * the observe stream. When all retries are exhausted, calls
 * {@link EventObserver.onHandlerError} or logs critically, then
 * returns without throwing so the observer can skip the event.
 */
const handleEventWithRetry = async (
    eventObserver: EventObserver,
    event: EventSourcingDBEvent,
    handlerRetryOptions: RetryOptions,
    span: Span,
    startTime: number,
): Promise<void> => {
    const { maxRetries, initialRetryDelayMs } = handlerRetryOptions;
    const metricLabels = {
        subject: eventObserver.subject,
        event_type: event.type,
    };

    try {
        await withRetry(
            () => eventObserver.eventHandler(event),
            {
                maxRetries,
                initialDelayMs: initialRetryDelayMs,
                maxDelayMs: Infinity,
                jitterFactor: 0.3,
                onRetry: ({ error, attempt, delayMs }) => {
                    observerHandlerRetryAttemptsCounter.add(1, metricLabels);
                    span.addEvent('retry', {
                        attempt,
                        delay_ms: delayMs,
                    });

                    getLogger().error({
                        category: 'Nimbus',
                        message:
                            `Error handling event "${event.id}" (${event.type}) for subject "${eventObserver.subject}" (retry ${attempt}/${maxRetries}), retrying in ${delayMs}ms`,
                        error,
                        ...(isEventData(event.data)
                            ? {
                                correlationId:
                                    event.data.nimbusMeta.correlationid,
                            }
                            : {}),
                    });
                },
            },
        );

        recordHandlerMetrics(metricLabels, 'success', startTime);
    } catch (error: unknown) {
        const handlerError = error instanceof Error
            ? error
            : new Error(String(error));

        recordHandlerMetrics(metricLabels, 'skipped', startTime);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: handlerError.message,
        });
        span.recordException(handlerError);

        await handleHandlerExhausted(
            eventObserver,
            event,
            handlerError,
            maxRetries,
        );
    }
};

/**
 * Handles exhausted handler retries by invoking
 * {@link EventObserver.onHandlerError} or emitting a critical log.
 */
const handleHandlerExhausted = async (
    eventObserver: EventObserver,
    event: EventSourcingDBEvent,
    handlerError: Error,
    maxRetries: number,
): Promise<void> => {
    if (eventObserver.onHandlerError) {
        try {
            await eventObserver.onHandlerError(handlerError, event);
        } catch (err: unknown) {
            // Isolate user callback failures so the poison
            // event is still skipped and observation continues.
            const callbackError = err instanceof Error
                ? err
                : new Error(String(err));

            getLogger().critical({
                category: 'Nimbus',
                message:
                    `onHandlerError failed for event "${event.id}" (${event.type}) for subject "${eventObserver.subject}". Skipping event.`,
                error: callbackError,
                ...(isEventData(event.data)
                    ? {
                        correlationId: event.data.nimbusMeta.correlationid,
                    }
                    : {}),
            });
        }
        return;
    }

    getLogger().critical({
        category: 'Nimbus',
        message:
            `Failed to handle event "${event.id}" (${event.type}) for subject "${eventObserver.subject}" after ${maxRetries} ${
                maxRetries === 1 ? 'retry' : 'retries'
            }. Skipping event.`,
        error: handlerError,
        ...(isEventData(event.data)
            ? {
                correlationId: event.data.nimbusMeta.correlationid,
            }
            : {}),
    });
};

/**
 * Starts observing events for the given {@link EventObserver} with
 * automatic reconnection on stream failure and separate in-place
 * retries for handler failures.
 *
 * Events are consumed from the stream and each one is passed to the
 * observer's event handler inside an OpenTelemetry span. If the event
 * carries a `traceparent`, the span is linked to the original writer's
 * trace for end-to-end distributed tracing.
 *
 * Handler failures are retried without reconnecting. After handler
 * retries are exhausted the event is skipped (lower bound advanced)
 * so observation can continue. When the connection drops, exponential
 * backoff with jitter is applied up to the configured maximum number
 * of connection retries.
 *
 * @param eventObserver - The event observer configuration.
 * @returns A promise that resolves when the observe stream ends or
 *   connection retries are exhausted.
 */
export const observeWithRetry = async (
    eventObserver: EventObserver,
): Promise<void> => {
    const connectionRetryOptions = resolveConnectionRetryOptions(
        eventObserver,
    );
    const handlerRetryOptions = resolveHandlerRetryOptions(eventObserver);

    let connectionRetryCount = 0;
    let lastProcessedEventId: string | undefined;

    while (true) {
        try {
            // Resolve the client on every attempt so a re-initialized
            // singleton is picked up after reconnecting to EventSourcingDB.
            const eventSourcingDBClient = getEventSourcingDBClient();

            // Once we have a concrete position, use it as lower bound and
            // drop fromLatestEvent; otherwise fall back to the original options.
            const lowerBound: Bound | undefined = lastProcessedEventId
                ? { id: lastProcessedEventId, type: 'exclusive' }
                : eventObserver.lowerBound;
            const fromLatestEvent: ObserveFromLatestEvent | undefined =
                lastProcessedEventId
                    ? undefined
                    : eventObserver.fromLatestEvent;

            logObserverConnection(eventObserver.subject, connectionRetryCount, {
                recursive: eventObserver.recursive ?? false,
                lowerBound,
                fromLatestEvent,
            });

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
                // Stream is healthy once events flow again. Count a successful
                // reconnect only here so failed reconnect attempts are excluded.
                if (connectionRetryCount > 0) {
                    observerConnectionReconnectsCounter.add(1, {
                        subject: eventObserver.subject,
                    });
                }
                connectionRetryCount = 0;

                const traceContext: TraceContext | undefined = event.traceparent
                    ? {
                        traceparent: event.traceparent,
                        tracestate: event.tracestate,
                    }
                    : undefined;

                const startTime = performance.now();

                await withObserveEventSpan(
                    event,
                    eventObserver.subject,
                    traceContext,
                    async (span) => {
                        await handleEventWithRetry(
                            eventObserver,
                            event,
                            handlerRetryOptions,
                            span,
                            startTime,
                        );
                    },
                );

                // Advance after success or skip so poison events do not block
                // the stream and reconnects resume past the last attempted event.
                lastProcessedEventId = event.id;
            }

            // If the loop completes normally (stream ended), we're done
            return;
        } catch (error) {
            connectionRetryCount++;

            const shouldRetry = await handleConnectionError(
                error,
                eventObserver.subject,
                connectionRetryCount,
                connectionRetryOptions.maxRetries,
                connectionRetryOptions.initialRetryDelayMs,
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
 * reconnecting according to its connection retry options until the
 * stream ends or connection retries are exhausted. Handler failures
 * are retried separately and do not stop the observer.
 *
 * @param eventObserver - The event observer configuration.
 */
export const initEventObserver = (eventObserver: EventObserver): void => {
    observeWithRetry(eventObserver);
};
