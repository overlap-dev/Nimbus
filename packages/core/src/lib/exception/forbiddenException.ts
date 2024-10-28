import { Exception } from './exception';

export class ForbiddenException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super('FORBIDDEN_EXCEPTION', message ?? 'Forbidden', details, 403);
    }
}
