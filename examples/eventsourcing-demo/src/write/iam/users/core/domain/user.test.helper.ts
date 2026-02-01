import { createCommand, createEvent } from '@nimbus/core';
import { createScenario } from '@nimbus/eventsourcingdb';
import { applyEventToUserState, type UserState } from './user.state.ts';
import {
    INVITE_USER_COMMAND_TYPE,
    type InviteUserCommand,
} from '../commands/inviteUser.command.ts';
import {
    ACCEPT_USER_INVITATION_COMMAND_TYPE,
    type AcceptUserInvitationCommand,
} from '../commands/acceptUserInvitation.command.ts';
import {
    USER_INVITED_EVENT_TYPE,
    type UserInvitedEvent,
} from '../events/userInvited.event.ts';

const TEST_SOURCE = 'https://test.overlap.at';

export const userScenario = () =>
    createScenario<UserState>({ id: 'test-user-id' }, applyEventToUserState);

export const anInviteUserCommand = (
    data: { email: string; firstName: string; lastName: string },
): InviteUserCommand =>
    createCommand<InviteUserCommand>({
        type: INVITE_USER_COMMAND_TYPE,
        source: TEST_SOURCE,
        data,
    });

export const anAcceptUserInvitationCommand = (
    data: { id: string; expectedRevision: string },
): AcceptUserInvitationCommand =>
    createCommand<AcceptUserInvitationCommand>({
        type: ACCEPT_USER_INVITATION_COMMAND_TYPE,
        source: TEST_SOURCE,
        data,
    });

export const aUserInvitedEvent = (
    data: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        invitedAt: string;
    },
): UserInvitedEvent =>
    createEvent<UserInvitedEvent>({
        type: USER_INVITED_EVENT_TYPE,
        source: TEST_SOURCE,
        subject: `/users/${data.id}`,
        data,
    });
