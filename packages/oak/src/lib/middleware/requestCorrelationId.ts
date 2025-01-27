import type { Context } from '@oak/oak/context';
import type { Next } from '@oak/oak/middleware';
import { ulid } from '@std/ulid';

/**
 * Middleware to add a correlation ID (ULID) to the request context.
 *
 * @param ctx - The Oak context
 * @param next - The Oak next function
 */
export const requestCorrelationId = async (
    ctx: Context,
    next: Next,
): Promise<void> => {
    ctx.state.correlationId = ulid();
    await next();
};
