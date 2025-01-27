import { Exception } from './exception.ts';

/**
 * Not found exception
 */
export class NotFoundException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super('NOT_FOUND_EXCEPTION', message ?? 'Not found', details, 404);
    }
}
