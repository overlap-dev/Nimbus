import { z } from 'zod';

/**
 * Zod schema for the AuthContext.
 *
 * This is a default AuthContext to store some basic information
 * about a user triggering a command, query or event.
 *
 * Feel free to define and use your own AuthContext with more detailed
 * information or a policy attached to handle access control.
 */
export const AuthContext = z.object({
    sub: z.string(),
    groups: z.array(z.string()),
});

/**
 * The AuthContext type.
 */
export type AuthContext = z.infer<typeof AuthContext>;
