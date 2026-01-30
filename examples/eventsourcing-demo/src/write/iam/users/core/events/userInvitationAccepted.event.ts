import { eventSchema } from '@nimbus/core';
import z from 'zod';

export const USER_INVITATION_ACCEPTED_EVENT_TYPE =
    'at.overlap.nimbus.user-invitation-accepted';

export const userInvitationAcceptedEventDataSchema = z.object({
    acceptedAt: z.iso.datetime(),
});

export const userInvitationAcceptedEventSchema = eventSchema.extend({
    type: z.literal(USER_INVITATION_ACCEPTED_EVENT_TYPE),
    data: userInvitationAcceptedEventDataSchema,
});
export type UserInvitationAcceptedEvent = z.infer<
    typeof userInvitationAcceptedEventSchema
>;
