import { AuthContext, getLogger } from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import type { Next } from '@oak/oak/middleware';

/**
 * ! NOT FOR PRODUCTION USE
 *
 * This is just a simple example of how to implement a middleware for authentication.
 */
export const exampleAuthMiddleware = async (
    ctx: Context,
    next: Next,
) => {
    const authorization = ctx.request.headers.get('authorization');

    if (!authorization) {
        const anonymousAuthContext: AuthContext = {
            sub: 'anonymous',
            groups: [],
        };

        ctx.state.authContext = anonymousAuthContext;

        await next();
    } else {
        try {
            const token = authorization?.replace('Bearer ', '');

            if (token === 'very-special-secret') {
                const adminAuthContext: AuthContext = {
                    sub: '02e50464-b051-70fa-25ef-63038890d80c',
                    groups: ['admin'],
                };

                ctx.state.authContext = adminAuthContext;
            } else {
                throw new Error('Invalid token');
            }

            await next();
        } catch (error: any) {
            getLogger().error({
                message: 'Failed to authenticate user',
                error,
            });

            ctx.response.status = 401;
            ctx.response.body = {
                message: 'Unauthorized',
            };
        }
    }
};
