import { commandSchema, createEvent } from '@nimbus/core';
import { z } from 'zod';
import { UserState } from '../domain/user.state.ts';
import {
    USER_INVITED_EVENT_TYPE,
    UserInvitedEvent,
} from '../events/userInvited.event.ts';

export const INVITE_USER_COMMAND_TYPE = 'at.overlap.nimbus.invite-user';

export const inviteUserInputSchema = z.object({
    email: z.email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
});

export const inviteUserCommandSchema = commandSchema.extend({
    type: z.literal(INVITE_USER_COMMAND_TYPE),
    data: inviteUserInputSchema,
});
export type InviteUserCommand = z.infer<typeof inviteUserCommandSchema>;

export const inviteUser = (
    state: UserState,
    command: InviteUserCommand,
): [UserInvitedEvent] => {
    // Always make sure to cast all user emails to lowercase
    const email = command.data.email.toLowerCase();

    const userInvitedEvent = createEvent<UserInvitedEvent>({
        type: USER_INVITED_EVENT_TYPE,
        source: command.source,
        correlationid: command.correlationid,
        subject: `/users/${state.id}`,
        data: {
            id: state.id,
            email: email,
            firstName: command.data.firstName,
            lastName: command.data.lastName,
            invitedAt: new Date().toISOString(),
        },
    });

    return [userInvitedEvent];
};
