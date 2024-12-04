import { Exception } from './exception.ts';

export class UnauthorizedException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'UNAUTHORIZED_EXCEPTION',
            message ?? 'Unauthorized',
            details,
            401,
        );
    }
}
