import { Exception } from './exception.ts';

/**
 * Forbidden exception
 */
export class ForbiddenException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super('FORBIDDEN', message ?? 'Forbidden', details, 403);
    }
}
