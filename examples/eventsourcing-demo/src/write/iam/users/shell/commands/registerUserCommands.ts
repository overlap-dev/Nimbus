import { getRouter } from '@nimbus-cqrs/core';
import {
    ACCEPT_USER_INVITATION_COMMAND_TYPE,
    acceptUserInvitationCommandSchema,
} from '../../core/commands/acceptUserInvitation.command.ts';
import {
    INVITE_USER_COMMAND_TYPE,
    inviteUserCommandSchema,
} from '../../core/commands/inviteUser.command.ts';
import { acceptUserInvitationCommandHandler } from './acceptUserInvitation.command.ts';
import { inviteUserCommandHandler } from './inviteUser.command.ts';

// Just a central place to register all the
// commands related to users.
//
// This is where we make them available for routing
// based on their type the input will be validated
// against the schema and the handler will be called.
export const registerUserCommands = () => {
    const router = getRouter('commandRouter');

    router.register(
        INVITE_USER_COMMAND_TYPE,
        inviteUserCommandHandler,
        inviteUserCommandSchema,
    );

    router.register(
        ACCEPT_USER_INVITATION_COMMAND_TYPE,
        acceptUserInvitationCommandHandler,
        acceptUserInvitationCommandSchema,
    );
};
