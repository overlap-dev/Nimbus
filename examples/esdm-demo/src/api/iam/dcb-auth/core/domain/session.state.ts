import { z } from 'zod';

/** How long a Session lasts before it ends on its own. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * A Session: the proof that one User is signed in, from login until logout
 * or `expiresAt`.
 */
export const sessionStateSchema = z.object({
    sessionId: z.uuid(),
    userId: z.uuid(),
    expiresAt: z.iso.datetime(),
});
export type SessionState = z.infer<typeof sessionStateSchema>;

/**
 * Starts a Session for a User at `now` with the default TTL.
 */
export const startSession = (
    userId: string,
    sessionId: string,
    now: Date,
): SessionState => {
    return {
        sessionId,
        userId,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    };
};
