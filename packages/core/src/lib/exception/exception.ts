/**
 * Base exception
 */
export class Exception extends Error {
    public details?: Record<string, unknown>;
    public statusCode?: number;

    constructor(
        name: string,
        message: string,
        details?: Record<string, unknown>,
        statusCode?: number,
    ) {
        super(message);
        this.name = name;

        if (details) {
            this.details = details;
        }

        if (statusCode) {
            this.statusCode = statusCode;
        }

        // Maintains proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    public fromError(error: Error): Exception {
        this.message = error.message;
        this.stack = error.stack;

        return this;
    }
}
