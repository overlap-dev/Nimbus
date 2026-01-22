import { metrics, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Collection, Document } from 'mongodb';

export const tracer = trace.getTracer('nimbus');

export const DB_SYSTEM = 'mongodb';

const meter = metrics.getMeter('nimbus');

const operationCounter = meter.createCounter('mongodb_operation_total', {
    description: 'Total number of MongoDB operations',
});

const operationDuration = meter.createHistogram(
    'mongodb_operation_duration_seconds',
    {
        description: 'Duration of MongoDB operations in seconds',
        unit: 's',
    },
);

/**
 * Wraps an async function with OpenTelemetry tracing and metrics.
 *
 * Records:
 * - `mongodb_operation_total` counter with operation, collection, and status labels
 * - `mongodb_operation_duration_seconds` histogram with operation and collection labels
 *
 * @param operation - The MongoDB operation name (e.g., 'findOne', 'insertMany')
 * @param collection - The MongoDB collection being operated on
 * @param fn - The async function to execute within the span
 * @returns The result of the async function
 */
export const withSpan = <T>(
    operation: string,
    collection: Collection<Document>,
    fn: () => Promise<T>,
): Promise<T> => {
    const startTime = performance.now();
    const metricLabels = {
        operation,
        collection: collection.collectionName,
    };

    return tracer.startActiveSpan(
        `mongodb.${operation}`,
        {
            kind: SpanKind.CLIENT,
            attributes: {
                'db.system': DB_SYSTEM,
                'db.operation': operation,
                'db.mongodb.collection': collection.collectionName,
            },
        },
        async (span) => {
            try {
                const result = await fn();

                // Record success metrics
                operationCounter.add(1, { ...metricLabels, status: 'success' });
                operationDuration.record(
                    (performance.now() - startTime) / 1000,
                    metricLabels,
                );

                return result;
            } catch (error) {
                // Record error metrics
                operationCounter.add(1, { ...metricLabels, status: 'error' });
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
