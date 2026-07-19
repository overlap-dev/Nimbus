import {
    context as otelContext,
    metrics,
    propagation,
    type Span,
    SpanKind,
    SpanStatusCode,
    trace,
} from '@opentelemetry/api';

export const tracer = trace.getTracer('nimbus');

export const DB_SYSTEM = 'eventsourcingdb';

const meter = metrics.getMeter('nimbus');

const operationCounter = meter.createCounter(
    'eventsourcingdb_operation_total',
    {
        description: 'Total number of EventSourcingDB operations',
    },
);

const operationDuration = meter.createHistogram(
    'eventsourcingdb_operation_duration_seconds',
    {
        description: 'Duration of EventSourcingDB operations in seconds',
        unit: 's',
    },
);

/**
 * Histogram of serialized Nimbus event sizes written via writeEvents.
 */
export const eventSizeBytes = meter.createHistogram(
    'eventsourcingdb_event_size_bytes',
    {
        description: 'Size of events written to EventSourcingDB in bytes',
        unit: 'By',
    },
);

/**
 * Counter of events handled by an event observer, labeled with
 * `status: success|skipped`.
 */
export const observerEventsHandledCounter = meter.createCounter(
    'eventsourcingdb_observer_events_handled_total',
    {
        description:
            'Total number of events handled by EventSourcingDB observers',
    },
);

/**
 * Histogram of observer handler duration in seconds (includes retries).
 */
export const observerHandlingDuration = meter.createHistogram(
    'eventsourcingdb_observer_handling_duration_seconds',
    {
        description:
            'Duration of EventSourcingDB observer event handling in seconds',
        unit: 's',
    },
);

/**
 * Counter of in-place handler retry attempts for event observers.
 */
export const observerHandlerRetryAttemptsCounter = meter.createCounter(
    'eventsourcingdb_observer_handler_retry_attempts_total',
    {
        description:
            'Total number of handler retry attempts for EventSourcingDB observers',
    },
);

/**
 * Counter of connection reconnect attempts scheduled after stream failure.
 */
export const observerConnectionRetryAttemptsCounter = meter.createCounter(
    'eventsourcingdb_observer_connection_retry_attempts_total',
    {
        description:
            'Total number of connection retry attempts for EventSourcingDB observers',
    },
);

/**
 * Counter of successful reconnects after one or more connection retries.
 */
export const observerConnectionReconnectsCounter = meter.createCounter(
    'eventsourcingdb_observer_connection_reconnects_total',
    {
        description:
            'Total number of successful connection reconnects for EventSourcingDB observers',
    },
);

/**
 * Trace context extracted from an EventSourcingDB event, used to link
 * the processing span to the span that originally wrote the event.
 */
export type TraceContext = {
    traceparent: string;
    tracestate?: string;
};

/**
 * Wraps an async function with OpenTelemetry tracing and metrics.
 *
 * Records:
 * - `eventsourcingdb_operation_total` counter with operation and status labels
 * - `eventsourcingdb_operation_duration_seconds` histogram with operation label
 *
 * @param operation - The EventSourcingDB operation name (e.g., 'readEvents', 'writeEvents')
 * @param fn - The async function to execute within the span
 * @param traceContext - Optional trace context from an EventSourcingDB event to
 *   continue a distributed trace from the event writer.
 * @returns The result of the async function
 */
export const withSpan = <T>(
    operation: string,
    fn: () => Promise<T>,
    traceContext?: TraceContext,
): Promise<T> => {
    const startTime = performance.now();
    const metricLabels = {
        operation,
    };

    const parentContext = traceContext
        ? propagation.extract(otelContext.active(), traceContext)
        : otelContext.active();

    return tracer.startActiveSpan(
        `eventsourcingdb.${operation}`,
        {
            kind: SpanKind.CLIENT,
            attributes: {
                'db.system': DB_SYSTEM,
                'db.operation': operation,
            },
        },
        parentContext,
        async (span) => {
            try {
                const result = await fn();

                // Record success metrics
                operationCounter.add(1, {
                    ...metricLabels,
                    status: 'success',
                });
                operationDuration.record(
                    (performance.now() - startTime) / 1000,
                    metricLabels,
                );

                return result;
            } catch (error) {
                // Record error metrics
                operationCounter.add(1, {
                    ...metricLabels,
                    status: 'error',
                });
                operationDuration.record(
                    (performance.now() - startTime) / 1000,
                    metricLabels,
                );

                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error
                        ? error.message
                        : 'Unknown error',
                });
                span.recordException(
                    error instanceof Error ? error : new Error('Unknown error'),
                );
                throw error;
            } finally {
                span.end();
            }
        },
    );
};

/**
 * Starts a consumer span for observing a single EventSourcingDB event,
 * optionally linked to the writer's trace via {@link TraceContext}.
 *
 * @param event - The observed EventSourcingDB event.
 * @param observerSubject - The observer's configured subject.
 * @param traceContext - Optional writer trace context from the event.
 * @param fn - Work to run inside the active span.
 */
export const withObserveEventSpan = <T>(
    event: { id: string; type: string; subject: string },
    observerSubject: string,
    traceContext: TraceContext | undefined,
    fn: (span: Span) => Promise<T>,
): Promise<T> => {
    const parentContext = traceContext
        ? propagation.extract(otelContext.active(), traceContext)
        : otelContext.active();

    return tracer.startActiveSpan(
        'eventsourcingdb.observeEvent',
        {
            kind: SpanKind.CONSUMER,
            attributes: {
                'db.system': DB_SYSTEM,
                'db.operation': 'observeEvent',
                'messaging.system': 'eventsourcingdb',
                'messaging.operation': 'process',
                'messaging.destination': event.type,
                'cloudevents.event_id': event.id,
                'cloudevents.event_type': event.type,
                'cloudevents.event_subject': event.subject,
                'eventsourcingdb.observer.subject': observerSubject,
            },
        },
        parentContext,
        fn,
    );
};

/**
 * Wraps an async generator with OpenTelemetry tracing and metrics.
 *
 * Records:
 * - `eventsourcingdb_operation_total` counter with operation and status labels
 * - `eventsourcingdb_operation_duration_seconds` histogram with operation label
 *
 * @param operation - The EventSourcingDB operation name (e.g., 'readEvents')
 * @param fn - The function returning an async generator to execute within the span
 * @returns An async generator that yields the same values as the inner generator
 */
export async function* withAsyncGeneratorSpan<T>(
    operation: string,
    fn: () => AsyncGenerator<T, void, void>,
): AsyncGenerator<T, void, void> {
    const startTime = performance.now();
    const metricLabels = {
        operation,
    };

    const span = tracer.startSpan(`eventsourcingdb.${operation}`, {
        kind: SpanKind.CLIENT,
        attributes: {
            'db.system': DB_SYSTEM,
            'db.operation': operation,
        },
    });

    try {
        yield* fn();

        // Record success metrics
        operationCounter.add(1, { ...metricLabels, status: 'success' });
        operationDuration.record(
            (performance.now() - startTime) / 1000,
            metricLabels,
        );
    } catch (error) {
        // Record error metrics
        operationCounter.add(1, { ...metricLabels, status: 'error' });
        operationDuration.record(
            (performance.now() - startTime) / 1000,
            metricLabels,
        );

        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(
            error instanceof Error ? error : new Error('Unknown error'),
        );
        throw error;
    } finally {
        span.end();
    }
}
