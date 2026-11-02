import {
    type CheckpointStore,
    calculateBackoffDelay as coreCalculateBackoffDelay,
    getLogger,
    withRetry,
} from '@nimbus-cqrs/core';
import { type Span, SpanStatusCode } from '@opentelemetry/api';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';
import {
    type Bound,
    type ConsumerRunner,
    createConsumerRunner,
} from './consumerRunner.ts';
import type { ConsumerStatus, EventConsumer } from './eventConsumer.ts';
import { isEventData } from './eventMapping.ts';
import { registerEventObserver } from './observerRegistry.ts';
import { readEvents } from './readEvents.ts';
import {
    observerConnectionReconnectsCounter,
    observerConnectionRetryAttemptsCounter,
    observerEventsHandledCounter,
    observerHandlerRetryAttemptsCounter,
    observerHandlingDuration,
    type TraceContext,
    withObserveEventSpan,
} from './tracing.ts';

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
 * An event observer watches one EventSourcingDB subject and feeds every
 * event to its {@link EventConsumer}s. The consumers share the stream, each
 * keeps its own checkpoint in the {@link checkpointStore}.
 *
 * On startup the observer resumes from the lowest checkpoint of its
 * consumers, replays what they miss and then stays live for new events.
 *
 * See https://docs.eventsourcingdb.io/getting-started/observing-events for more information.
 */
export type EventObserver = {
    /**
     * The unique name of the observer. It is stored on every checkpoint
     * and used to look the observer up with {@link getEventObserver}.
     */
    name: string;
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
     * The consumers of the observed events, run in declaration order.
     */
    consumers: readonly EventConsumer[];
    /**
     * Where the consumers' checkpoints are persisted.
     */
    checkpointStore: CheckpointStore;
    /**
     * Options for retry behavior when the observe stream / connection fails.
     * This includes a stream that the server closes (e.g. during a restart)
     * and a stalled connection. Uses exponential backoff with jitter
     * between reconnects.
     * Defaults to { maxRetries: 3, initialRetryDelayMs: 3000 }.
     */
    connectionRetryOptions?: RetryOptions;
    /**
     * Options for retry behavior when a consumer throws. Handler retries
     * happen in-place without reconnecting the stream. Once they are
     * exhausted the failing consumers are halted.
     * Defaults to { maxRetries: 3, initialRetryDelayMs: 3000 }.
     */
    handlerRetryOptions?: RetryOptions;
};

/**
 * Where an observer currently is in the stream.
 *
 * - `catching-up`: replaying events that were already stored when the
 *   observer started.
 * - `live`: every event stored at startup has been processed; the
 *   observer now receives new events as they are written.
 * - `stopped`: connection retries are exhausted and the observer gave up.
 */
export type ObserverPhase = 'catching-up' | 'live' | 'stopped';

/**
 * The current status of an observer and its consumers.
 *
 * @property {string} name - The observer name.
 * @property {string} subject - The observed subject.
 * @property {ObserverPhase} phase - Where the observer is in the stream.
 * @property {ConsumerStatus[]} consumers - The state of every consumer in declaration order.
 */
export type ObserverStatus = {
    name: string;
    subject: string;
    phase: ObserverPhase;
    consumers: ConsumerStatus[];
};

/**
 * The result of {@link EventObserverHandle.healthCheck}.
 */
export type ObserverHealth = {
    status: 'healthy' | 'error';
    details?: string;
};

/**
 * The handle returned by {@link initEventObserver} to inspect a running
 * observer.
 */
export type EventObserverHandle = {
    /**
     * The observer name.
     */
    readonly name: string;
    /**
     * The observed subject.
     */
    readonly subject: string;
    /**
     * A snapshot of the observer and its consumers.
     */
    readonly status: () => ObserverStatus;
    /**
     * `error` when the observer stopped or any consumer is halted,
     * `healthy` otherwise. A consumer that is still catching up is
     * healthy.
     */
    readonly healthCheck: () => ObserverHealth;
};

/**
 * Returns a promise that resolves after the given number of milliseconds.
 */
const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const OBSERVER_BACKOFF_OPTIONS = {
    jitterFactor: 0.3,
    maxDelayMs: Infinity,
} as const;

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
    coreCalculateBackoffDelay(
        initialDelayMs,
        attempt,
        OBSERVER_BACKOFF_OPTIONS,
    );

const resolveRetryOptions = (options?: RetryOptions): RetryOptions => ({
    maxRetries: options?.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
    initialRetryDelayMs:
        options?.initialRetryDelayMs ??
        DEFAULT_RETRY_OPTIONS.initialRetryDelayMs,
});

/**
 * Logs an informational message when an event observer connects or
 * reconnects to EventSourcingDB. When {@link retryCount} is greater
 * than zero the message indicates a successful reconnection.
 */
const logObserverConnection = (
    observer: EventObserver,
    retryCount: number,
    data: Record<string, unknown>,
): void => {
    const retryLabel = retryCount === 1 ? 'retry' : 'retries';
    const message =
        retryCount > 0
            ? `Reconnected event observer "${observer.name}" for subject "${observer.subject}" after ${retryCount} ${retryLabel}`
            : `Observer "${observer.name}" observing events for subject "${observer.subject}"`;

    getLogger().info({ category: 'Nimbus', message, data });
};

/**
 * Handles a connection / stream error by logging it and waiting with
 * exponential backoff before the next reconnect attempt. When the
 * maximum number of retries is exceeded a critical log entry is
 * emitted and no further retries are attempted.
 *
 * @returns `true` if the observer should retry, `false` if retries
 *   are exhausted.
 */
const handleConnectionError = async (
    error: unknown,
    observer: EventObserver,
    retryCount: number,
    maxRetries: number,
    initialRetryDelayMs: number,
): Promise<boolean> => {
    if (retryCount > maxRetries) {
        getLogger().critical({
            category: 'Nimbus',
            message: `Observer "${observer.name}" failed to observe events for subject "${observer.subject}" after ${maxRetries} ${
                maxRetries === 1 ? 'retry' : 'retries'
            }.`,
        });
        return false;
    }

    observerConnectionRetryAttemptsCounter.add(1, {
        subject: observer.subject,
    });

    const backoffDelay = coreCalculateBackoffDelay(
        initialRetryDelayMs,
        retryCount - 1,
        OBSERVER_BACKOFF_OPTIONS,
    );

    getLogger().error({
        category: 'Nimbus',
        message: `Error observing events for subject "${observer.subject}" (retry ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`,
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

const correlationIdOf = (
    event: EventSourcingDBEvent,
): { correlationId: string } | Record<never, never> => {
    return isEventData(event.data)
        ? { correlationId: event.data.nimbusMeta.correlationid }
        : {};
};

/**
 * Offers the event to the consumers with in-place retries. Does not
 * reconnect the observe stream. When all retries are exhausted, halts the
 * failing consumers and returns without throwing so the observer can
 * move on.
 */
const handleEventWithRetry = async (
    observer: EventObserver,
    runner: ConsumerRunner,
    event: EventSourcingDBEvent,
    handlerRetryOptions: RetryOptions,
    span: Span,
    startTime: number,
): Promise<void> => {
    const { maxRetries, initialRetryDelayMs } = handlerRetryOptions;
    const metricLabels = {
        subject: observer.subject,
        event_type: event.type,
    };

    try {
        await withRetry(() => runner.handle(event), {
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
                    message: `Error handling event "${event.id}" (${event.type}) on observer "${observer.name}" (retry ${attempt}/${maxRetries}), retrying in ${delayMs}ms`,
                    error,
                    ...correlationIdOf(event),
                });
            },
        });

        recordHandlerMetrics(metricLabels, 'success', startTime);
    } catch (error: unknown) {
        const handlerError =
            error instanceof Error ? error : new Error(String(error));

        recordHandlerMetrics(metricLabels, 'skipped', startTime);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: handlerError.message,
        });
        span.recordException(handlerError);

        try {
            await runner.onExhausted(handlerError, event);
        } catch (err: unknown) {
            // The consumers are halted in memory either way; only the
            // persisted failure marker is lost.
            getLogger().critical({
                category: 'Nimbus',
                message: `Could not persist the failure of observer "${observer.name}" at event "${event.id}" (${event.type}).`,
                error: err instanceof Error ? err : new Error(String(err)),
                ...correlationIdOf(event),
            });
        }
    }
};

/**
 * The id of the newest event on the subject, or `null` when the subject
 * has no events yet. Used to tell catch-up from live.
 */
const readHeadEventId = async (
    observer: EventObserver,
): Promise<string | null> => {
    const controller = new AbortController();
    // Antichronological, so the first event is the newest. Read only that one.
    const iterator = readEvents(
        observer.subject,
        {
            recursive: observer.recursive ?? false,
            order: 'antichronological',
        },
        controller.signal,
    )[Symbol.asyncIterator]();

    let head: string | null = null;
    let failure: unknown;

    try {
        const first = await iterator.next();

        if (!first.done) {
            head = first.value.id;
            controller.abort();
        }
    } catch (error) {
        failure = error;
    }

    try {
        await iterator.return();
    } catch (error) {
        if (!controller.signal.aborted) {
            failure = error;
        }
    }

    if (failure !== undefined && !controller.signal.aborted) {
        throw failure;
    }

    return head;
};

type ObserverRuntime = {
    runner: ConsumerRunner;
    phase: ObserverPhase;
    /** The newest event id at startup. Set to live once it has been processed. */
    head: bigint | null;
};

/**
 * Observes the subject with automatic reconnection on stream failure and
 * in-place retries for consumer failures. Resolves once connection retries
 * are exhausted.
 */
const observeWithRetry = async (
    observer: EventObserver,
    runtime: ObserverRuntime,
): Promise<void> => {
    const connectionRetryOptions = resolveRetryOptions(
        observer.connectionRetryOptions,
    );
    const handlerRetryOptions = resolveRetryOptions(
        observer.handlerRetryOptions,
    );

    let connectionRetryCount = 0;
    let lastProcessedEventId: string | undefined;

    while (true) {
        try {
            // Resolve the client on every attempt so a re-initialized
            // singleton is picked up after reconnecting to EventSourcingDB.
            const eventSourcingDBClient = getEventSourcingDBClient();

            const lowerBound: Bound = lastProcessedEventId
                ? { id: lastProcessedEventId, type: 'exclusive' }
                : runtime.runner.lowerBound;

            logObserverConnection(observer, connectionRetryCount, {
                observer: observer.name,
                recursive: observer.recursive ?? false,
                lowerBound,
            });

            for await (const event of eventSourcingDBClient.observeEvents(
                observer.subject,
                {
                    recursive: observer.recursive ?? false,
                    lowerBound,
                },
            )) {
                // Stream is healthy once events flow again. Count a successful
                // reconnect only here so failed reconnect attempts are excluded.
                if (connectionRetryCount > 0) {
                    observerConnectionReconnectsCounter.add(1, {
                        subject: observer.subject,
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
                    observer.subject,
                    traceContext,
                    async (span) => {
                        await handleEventWithRetry(
                            observer,
                            runtime.runner,
                            event,
                            handlerRetryOptions,
                            span,
                            startTime,
                        );
                    },
                );

                // Advance after success or halt so a halted consumer does not
                // block the stream and reconnects resume past the last event.
                lastProcessedEventId = event.id;

                if (
                    runtime.phase === 'catching-up' &&
                    (runtime.head === null || BigInt(event.id) >= runtime.head)
                ) {
                    runtime.phase = 'live';
                }
            }

            // Observing never ends on its own: the SDK throws when the
            // server closes the stream, so this is only reached if the
            // generator finishes without an error (e.g. an aborted
            // stream). Treat it as the end of observation.
            runtime.phase = 'stopped';
            return;
        } catch (error) {
            connectionRetryCount++;

            const shouldRetry = await handleConnectionError(
                error,
                observer,
                connectionRetryCount,
                connectionRetryOptions.maxRetries,
                connectionRetryOptions.initialRetryDelayMs,
            );

            if (!shouldRetry) {
                runtime.phase = 'stopped';
                return;
            }
        }
    }
};

const createHandle = (
    observer: EventObserver,
    runtime: ObserverRuntime,
): EventObserverHandle => {
    const status = (): ObserverStatus => {
        return {
            name: observer.name,
            subject: observer.subject,
            phase: runtime.phase,
            consumers: runtime.runner.status(),
        };
    };

    const healthCheck = (): ObserverHealth => {
        const current = status();
        const halted = current.consumers
            .filter((consumer) => {
                return consumer.halted;
            })
            .map((consumer) => {
                return consumer.name;
            });

        if (current.phase === 'stopped') {
            return {
                status: 'error',
                details: `Observer "${observer.name}" stopped after exhausting its connection retries`,
            };
        }

        if (halted.length > 0) {
            return {
                status: 'error',
                details: `Halted consumer(s): ${halted.join(', ')}`,
            };
        }

        return { status: 'healthy' };
    };

    return {
        name: observer.name,
        subject: observer.subject,
        status,
        healthCheck,
    };
};

/**
 * Starts an event observer.
 *
 * Loads the consumers' checkpoints, reads the newest event of the subject
 * to know when the catch-up is over, registers the observer under its
 * name and starts the observation loop in the background. The returned
 * promise resolves once the loop has been started, not once the observer
 * has caught up, so a checkpoint store that cannot be reached fails the
 * application start instead of silently replaying everything.
 *
 * The loop keeps running and reconnecting according to the connection
 * retry options until those are exhausted. Consumer failures are retried
 * in place. Once handler retries are exhausted the failing consumers are
 * halted and the observer moves on.
 *
 * @param observer - The event observer configuration.
 * @returns A handle to inspect the running observer.
 *
 * @throws {GenericException} If an observer with the same name is already
 *   registered, or the consumers are declared inconsistently.
 */
export const initEventObserver = async (
    observer: EventObserver,
): Promise<EventObserverHandle> => {
    const runner = await createConsumerRunner({
        observer: observer.name,
        consumers: observer.consumers,
        checkpointStore: observer.checkpointStore,
    });
    const headEventId = await readHeadEventId(observer);
    const head = headEventId === null ? null : BigInt(headEventId);

    const alreadyLive =
        head === null ||
        (runner.lowerBound.type === 'exclusive' &&
            BigInt(runner.lowerBound.id) >= head);

    const runtime: ObserverRuntime = {
        runner,
        phase: alreadyLive ? 'live' : 'catching-up',
        head,
    };

    const handle = createHandle(observer, runtime);
    registerEventObserver(handle);

    void observeWithRetry(observer, runtime);

    return handle;
};
