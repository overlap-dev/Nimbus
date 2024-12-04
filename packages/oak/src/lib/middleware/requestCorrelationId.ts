import type { Context } from '@oak/oak/context';
import type { Next } from '@oak/oak/middleware';
import { ulid } from '@std/ulid';

export const requestCorrelationId = async (
    ctx: Context,
    next: Next,
): Promise<void> => {
    ctx.state.correlationId = ulid();
    await next();
};
