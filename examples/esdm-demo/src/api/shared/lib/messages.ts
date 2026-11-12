import { z } from 'zod';
import type { AuthContext } from '../../iam/dcb-auth/core/domain/auth-context.ts';

export const SYSTEM_ACTOR = 'system' as const;

/**
 * Actor recorded on an event payload (ADR-0005): the user-id of the User
 * whose command produced the event, or `system` when the domain emitted it
 * itself.
 */
export const actorSchema = z.union([z.uuid(), z.literal(SYSTEM_ACTOR)]);
export type Actor = z.infer<typeof actorSchema>;

export const actorFromAuthContext = (
    authcontext: AuthContext | null,
): Actor => {
    if (authcontext == null) {
        return SYSTEM_ACTOR;
    }

    return authcontext.userId;
};
