import { z } from 'zod';

/**
 * What a request knows about the signed-in User: the Session it rides on
 * and the User the Session names. Carried on every authenticated command
 * and query as `authcontext`.
 */
export const authContextSchema = z.object({
    sessionId: z.uuid(),
    userId: z.uuid(),
    expiresAt: z.iso.datetime(),
});
export type AuthContext = z.infer<typeof authContextSchema>;
