import {
    commandSchema,
    createEvent,
    InvalidInputException,
} from '@nimbus/core';
import { z } from 'zod';
import { hasPendingInvitation, UserState } from '../domain/user.state.ts';
import {
    USER_INVITATION_ACCEPTED_EVENT_TYPE,
    UserInvitationAcceptedEvent,
} from '../events/userInvitationAccepted.event.ts';

export const ACCEPT_USER_INVITATION_COMMAND_TYPE =
    'at.overlap.nimbus.accept-user-invitation';

export const acceptUserInvitationInputSchema = z.object({
    id: z.string().min(1),
    expectedRevision: z.string().min(1),
});

export const acceptUserInvitationCommandSchema = commandSchema.extend({
    type: z.literal(ACCEPT_USER_INVITATION_COMMAND_TYPE),
    data: acceptUserInvitationInputSchema,
});
export type AcceptUserInvitationCommand = z.infer<
    typeof acceptUserInvitationCommandSchema
>;

export const acceptUserInvitation = (
    state: UserState,
    command: AcceptUserInvitationCommand,
): [UserInvitationAcceptedEvent] => {
    if (!hasPendingInvitation(state)) {
        throw new InvalidInputException(
            'The user does not have a pending invitation',
            {
                errorCode: 'USER_HAS_NO_PENDING_INVITATION',
                details: {
                    userId: state.id,
                },
            },
        );
    }

    const inviteExpiredAfterHours = 24;

    if (
        state.invitedAt &&
        new Date(state.invitedAt).getTime() +
                    inviteExpiredAfterHours * 60 * 60 * 1000 < Date.now()
    ) {
        throw new InvalidInputException('The invitation has expired', {
            errorCode: 'INVITATION_EXPIRED',
            details: {
                userId: state.id,
            },
        });
    }

    const userInvitationAcceptedEvent = createEvent<
        UserInvitationAcceptedEvent
    >({
        type: USER_INVITATION_ACCEPTED_EVENT_TYPE,
        source: command.source,
        correlationid: command.correlationid,
        subject: `/users/${state.id}`,
        data: {
            acceptedAt: new Date().toISOString(),
        },
    });

    return [userInvitationAcceptedEvent];
};
