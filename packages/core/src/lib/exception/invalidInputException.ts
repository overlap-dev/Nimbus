import type { ZodError } from 'zod';
import { Exception } from './exception.ts';

/**
 * Invalid input exception
 */
export class InvalidInputException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'INVALID_INPUT_EXCEPTION',
            message ?? 'The provided input is invalid',
            details,
            400,
        );
    }

    /**
     * Takes a Zod error and creates an InvalidInputException from it.
     * Takes care to preserve the stack and issues from the Zod error.
     *
     * @param {ZodError} error - The Zod error.
     *
     * @returns {InvalidInputException} The InvalidInputException.
     */
    public fromZodError(error: ZodError): InvalidInputException {
        this.stack = error.stack;
        this.details = {
            issues: error.issues,
        };

        return this;
    }
}
