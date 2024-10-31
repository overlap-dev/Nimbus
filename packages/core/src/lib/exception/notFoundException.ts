import { Exception } from './exception.ts';

export class NotFoundException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super('NOT_FOUND_EXCEPTION', message ?? 'Not found', details, 404);
    }
}
