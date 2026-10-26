import type { Context, MiddlewareHandler } from 'hono';
import { authUnauthorizedException } from '../../core/domain/auth.exceptions.ts';
import type { AuthContext } from '../../core/domain/auth-context.ts';
import { DEMO_USERS } from '../demo-users.ts';

export const HONO_AUTH_CONTEXT_KEY = 'authcontext';

/**
 * The one AuthContext every request runs with. IAM is mocked in this
 * example: there is no session cookie and no Session lookup.
 */
export const DEMO_AUTH_CONTEXT: AuthContext = {
    sessionId: '00000000-0000-4000-8000-000000000001',
    userId: DEMO_USERS[0].userId,
    expiresAt: '9999-12-31T23:59:59.000Z',
};

/**
 * Attaches the AuthContext to the request. A real implementation reads the
 * session cookie, loads the Session and rejects expired or unknown ones.
 */
export const authentication = (): MiddlewareHandler => {
    return async (c, next) => {
        c.set(HONO_AUTH_CONTEXT_KEY, DEMO_AUTH_CONTEXT);
        await next();
    };
};

/**
 * Get the AuthContext from the Hono context.
 *
 * @param c - The Hono context
 * @returns The AuthContext
 * @throws UnauthorizedException if the AuthContext is not set
 */
export const getAuthContext = (c: Context): AuthContext => {
    const authContext = c.get(HONO_AUTH_CONTEXT_KEY) as AuthContext | undefined;

    if (!authContext) {
        throw authUnauthorizedException();
    }

    return authContext;
};
