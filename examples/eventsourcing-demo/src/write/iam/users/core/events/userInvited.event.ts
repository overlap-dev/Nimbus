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

/**
 * Type guard that checks whether the given event is a {@link UserInvitedEvent}.
 *
 * @param event - The event to check.
 * @returns `true` if the event is a {@link UserInvitedEvent}, `false` otherwise.
 */
export const isUserInvitedEvent = (
    event: { type: string },
): event is UserInvitedEvent => {
    return event.type === USER_INVITED_EVENT_TYPE;
};
