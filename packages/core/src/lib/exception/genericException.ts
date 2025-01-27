import { Exception } from './exception.ts';

/**
 * Generic exception
 */
export class GenericException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'GENERIC_EXCEPTION',
            message ?? 'An error occurred',
            details,
            500,
        );
    }
}
