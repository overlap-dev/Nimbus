import { eventSchema } from '@nimbus/core';
import z from 'zod';

export const USER_INVITED_EVENT_TYPE = 'at.overlap.nimbus.user-invited';

export const userInvitedEventDataSchema = z.object({
    id: z.string(),
    email: z.email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    invitedAt: z.iso.datetime(),
});

export const userInvitedEventSchema = eventSchema.extend({
    type: z.literal(USER_INVITED_EVENT_TYPE),
    data: userInvitedEventDataSchema,
});
export type UserInvitedEvent = z.infer<typeof userInvitedEventSchema>;
