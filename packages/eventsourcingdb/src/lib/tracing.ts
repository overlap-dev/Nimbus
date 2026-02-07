import {
    context as otelContext,
    metrics,
    propagation,
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
