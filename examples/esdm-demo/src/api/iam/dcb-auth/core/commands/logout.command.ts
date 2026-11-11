import { commandSchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { authContextSchema } from '../domain/auth-context.ts';

export const LOGOUT_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.iam.auth.logout`;

export const logoutInputSchema = z.object({
    sessionId: z.uuid(),
});

export const logoutCommandSchema = commandSchema.extend({
    type: z.literal(LOGOUT_COMMAND_TYPE),
    data: logoutInputSchema,
    authcontext: authContextSchema,
});
export type LogoutCommand = z.infer<typeof logoutCommandSchema>;
