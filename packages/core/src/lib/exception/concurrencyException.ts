import { Exception } from './exception.ts';

/**
 * Exception thrown when a concurrency conflict occurs.
 *
 * This typically happens in event sourcing when using optimistic concurrency control
 * and another process has modified the aggregate between reading and writing.
 */
export class ConcurrencyException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'CONCURRENCY_EXCEPTION',
            message ?? 'Concurrency conflict detected',
            details,
            409,
        );
    }
}
