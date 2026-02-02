import { inviteUser } from '../commands/inviteUser.command.ts';
import { acceptUserInvitation } from '../commands/acceptUserInvitation.command.ts';
import { USER_INVITED_EVENT_TYPE } from '../events/userInvited.event.ts';
import { USER_INVITATION_ACCEPTED_EVENT_TYPE } from '../events/userInvitationAccepted.event.ts';
import {
    anAcceptUserInvitationCommand,
    anInviteUserCommand,
    aUserInvitedEvent,
    userScenario,
} from './user.test.helper.ts';

Deno.test('inviteUser emits UserInvited event', () => {
    userScenario()
        .given([])
        .when((state) =>
            inviteUser(
                state,
                anInviteUserCommand({
                    email: 'jane@example.com',
                    firstName: 'Jane',
                    lastName: 'Doe',
                }),
            )
        )
        .then([{
            type: USER_INVITED_EVENT_TYPE,
            data: {
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
            },
        }]);
});

Deno.test('inviteUser lowercases email', () => {
    userScenario()
        .given([])
        .when((state) =>
            inviteUser(
                state,
                anInviteUserCommand({
                    email: 'Jane@Example.COM',
                    firstName: 'Jane',
                    lastName: 'Doe',
                }),
            )
        )
        .then([{
            type: USER_INVITED_EVENT_TYPE,
            data: { email: 'jane@example.com' },
        }]);
});

Deno.test('acceptUserInvitation emits UserInvitationAccepted event', () => {
    userScenario()
        .given([
            aUserInvitedEvent({
                id: 'test-user-id',
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
                invitedAt: new Date().toISOString(),
            }),
        ])
        .when((state) =>
            acceptUserInvitation(
                state,
                anAcceptUserInvitationCommand({
                    id: 'test-user-id',
                    expectedRevision: 'any',
                }),
            )
        )
        .then([{
            type: USER_INVITATION_ACCEPTED_EVENT_TYPE,
        }]);
});

Deno.test('acceptUserInvitation throws if no pending invitation', () => {
    userScenario()
        .given([])
        .when((state) =>
            acceptUserInvitation(
                state,
                anAcceptUserInvitationCommand({
                    id: 'test-user-id',
                    expectedRevision: 'any',
                }),
            )
        )
        .thenThrows('USER_HAS_NO_PENDING_INVITATION');
});

Deno.test('acceptUserInvitation throws if invitation expired', () => {
    const expiredDate = new Date(
        Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();

    userScenario()
        .given([
            aUserInvitedEvent({
                id: 'test-user-id',
                email: 'jane@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
                invitedAt: expiredDate,
            }),
        ])
        .when((state) =>
            acceptUserInvitation(
                state,
                anAcceptUserInvitationCommand({
                    id: 'test-user-id',
                    expectedRevision: 'any',
                }),
            )
        )
        .thenThrows('INVITATION_EXPIRED');
});
