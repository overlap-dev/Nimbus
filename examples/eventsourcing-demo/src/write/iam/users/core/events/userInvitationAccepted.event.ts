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

/**
 * Type guard that checks whether the given event is a {@link UserInvitationAcceptedEvent}.
 *
 * @param event - The event to check.
 * @returns `true` if the event is a {@link UserInvitationAcceptedEvent}, `false` otherwise.
 */
export const isUserInvitationAcceptedEvent = (
    event: { type: string },
): event is UserInvitationAcceptedEvent => {
    return event.type === USER_INVITATION_ACCEPTED_EVENT_TYPE;
};
