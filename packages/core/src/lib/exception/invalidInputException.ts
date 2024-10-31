import type { ZodError } from 'zod';
import { Exception } from './exception.ts';

export class InvalidInputException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'INVALID_INPUT_EXCEPTION',
            message ?? 'The provided input is invalid',
            details,
            400,
        );
    }

    public fromZodError(error: ZodError) {
        this.stack = error.stack;
        this.details = {
            issues: error.issues,
        };

        return this;
    }
}
