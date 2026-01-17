import { Exception } from './exception.ts';

/**
 * Generic exception
 */
export class GenericException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'INTERNAL_SERVER_ERROR',
            message ?? 'Internal server error',
            details,
            500,
        );
    }
}
