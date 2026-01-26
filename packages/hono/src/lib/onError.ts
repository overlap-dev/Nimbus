import { Exception, getLogger } from '@nimbus/core';
import type { Context } from 'hono';
import type { HTTPResponseError } from 'hono/types';

/**
 * An error handler for Hono applications that maps
 * Nimbus exceptions to HTTP responses and handles
 * other unhandled errors.
 *
 * @param error - The error to handle.
 * @param c - The Hono context.
 *
 * @example
 * ```ts
 * import { handleError } from '@nimbus/hono';
 *
 * const app = new Hono();
 * app.onError(handleError);
 * ```
 */
export const handleError = (
    error: Error | HTTPResponseError,
    c: Context,
): Response => {
    let statusCode = 500;
    let response: Record<string, any> = {
        error: 'INTERNAL_SERVER_ERROR',
    };

    const isNimbusException = error instanceof Exception;

    if (isNimbusException) {
        statusCode = error.statusCode ?? 500;
        response = {
            error: error.name,
            message: error.message,
            ...(error.details && { details: error.details }),
        };

        if (statusCode >= 500) {
            getLogger().error({
                category: 'Nimbus',
                message: error.message,
                error,
            });
        } else {
            getLogger().debug({
                category: 'Nimbus',
                message: error.message,
                error,
            });
        }
    } else {
        getLogger().critical({
            category: 'Nimbus',
            message: 'An unhandled error occurred',
            error,
        });
    }

    return c.json(response, statusCode as any);
};
