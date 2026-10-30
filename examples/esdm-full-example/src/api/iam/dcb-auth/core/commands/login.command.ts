import { commandSchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { authInvalidCredentialsException } from '../domain/auth.exceptions.ts';
import { type SessionState, startSession } from '../domain/session.state.ts';

export const LOGIN_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.iam.auth.login`;

export const loginInputSchema = z.object({
    email: z.email(),
    password: z.string().min(1).max(128),
});

export const loginCommandSchema = commandSchema.extend({
    type: z.literal(LOGIN_COMMAND_TYPE),
    data: loginInputSchema,
});
export type LoginCommand = z.infer<typeof loginCommandSchema>;

/**
 * Starts a Session for the User the Credentials matched. `userId` is
 * `null` when the shell found no User for the Credentials — the command
 * is then rejected (`credentials-must-match`).
 */
export const login = (
    userId: string | null,
    sessionId: string,
    now: Date,
): SessionState => {
    if (userId === null) {
        throw authInvalidCredentialsException();
    }

    return startSession(userId, sessionId, now);
};
