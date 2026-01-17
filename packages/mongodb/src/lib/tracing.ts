import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Collection, Document } from 'mongodb';

export const tracer = trace.getTracer('nimbus');

export const DB_SYSTEM = 'mongodb';

/**
 * Wraps an async function with OpenTelemetry tracing.
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
                return await fn();
            } catch (error) {
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
