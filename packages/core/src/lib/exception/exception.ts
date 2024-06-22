export class Exception {
    public readonly name: string;
    public message: string;
    public stack?: string;
    public details?: Record<string, unknown>;
    public statusCode?: number;

    constructor(
        name: string,
        message: string,
        details?: Record<string, unknown>,
        statusCode?: number,
    ) {
        this.name = name;
        this.message = message;

        if (details) {
            this.details = details;
        }

        if (statusCode) {
            this.statusCode = statusCode;
        }
    }

    public fromError(error: Error) {
        this.message = error.message;
        this.stack = error.stack;

        return this;
    }
}
