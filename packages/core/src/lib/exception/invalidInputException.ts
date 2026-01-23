import type { ZodError } from 'zod';
import { Exception } from './exception.ts';

/**
 * Invalid input exception
 */
export class InvalidInputException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            'INVALID_INPUT',
            message ?? 'Invalid input',
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
        if (error.stack) {
            this.stack = error.stack;
        }

        if (error.issues) {
            this.details = {
                issues: error.issues,
            };
        }

        return this;
    }
}
