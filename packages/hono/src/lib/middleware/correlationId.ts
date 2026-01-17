import type { MiddlewareHandler } from 'hono';
import { ulid } from '@std/ulid';

/**
 * Header names to check for an existing correlation ID.
 * Checked in order of priority.
 */
const CORRELATION_ID_HEADERS = [
    'x-correlation-id',
    'x-request-id',
    'request-id',
] as const;

/**
 * The key used to store the correlation ID in the Hono context.
 */
export const CORRELATION_ID_KEY = 'correlationId' as const;

/**
 * Options for configuring the correlation ID middleware.
 */
export type CorrelationIdOptions = {
    /**
     * Add the correlation ID to the response headers.
     * Defaults to true.
     */
    addToResponseHeaders?: boolean;
    /**
     * The header name to use when adding to response headers.
     * Defaults to "x-correlation-id".
     */
    responseHeaderName?: string;
};

/**
 * Correlation ID middleware for Hono.
 *
 * This middleware extracts the correlation ID from incoming request headers
 * or generates a new one using ULID if not present. The correlation ID is
 * stored in the Hono context and optionally added to response headers.
 *
 * Checked headers (in order):
 * - x-correlation-id
 * - x-request-id
 * - request-id
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { correlationId, getCorrelationId } from '@nimbus/hono';
 *
 * const app = new Hono();
 * app.use(correlationId());
 *
 * app.get('/', (c) => {
 *     const id = getCorrelationId(c);
 *     return c.json({ correlationId: id });
 * });
 * ```
 */
export const correlationId = (
    options?: CorrelationIdOptions,
): MiddlewareHandler => {
    const addToResponseHeaders = options?.addToResponseHeaders ?? true;
    const responseHeaderName = options?.responseHeaderName ??
        'x-correlation-id';

    return async (c, next) => {
        let id: string | undefined;

        // Check incoming headers for existing correlation ID
        for (const header of CORRELATION_ID_HEADERS) {
            const value = c.req.header(header);
            if (value) {
                id = value;
                break;
            }
        }

        // Generate new ID if not found
        if (!id) {
            id = ulid();
        }

        // Store in context
        c.set(CORRELATION_ID_KEY, id);

        // Optionally add to response headers
        if (addToResponseHeaders) {
            c.header(responseHeaderName, id);
        }

        await next();
    };
};

/**
 * Get the correlation ID from the Hono context.
 *
 * @param c - The Hono context
 * @returns The correlation ID or undefined if not set
 */
export const getCorrelationId = (c: {
    get: (key: typeof CORRELATION_ID_KEY) => string | undefined;
}): string => {
    return c.get(CORRELATION_ID_KEY) ?? '';
};
