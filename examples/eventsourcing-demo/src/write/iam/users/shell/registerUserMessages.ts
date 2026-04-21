import { getRouter } from '@nimbus-cqrs/core';
import {
    ACCEPT_USER_INVITATION_COMMAND_TYPE,
    acceptUserInvitationCommandSchema,
} from '../core/commands/acceptUserInvitation.command.ts';
import {
    INVITE_USER_COMMAND_TYPE,
    inviteUserCommandSchema,
} from '../core/commands/inviteUser.command.ts';
import { acceptUserInvitationCommandHandler } from './commands/acceptUserInvitation.command.ts';
import { inviteUserCommandHandler } from './commands/inviteUser.command.ts';

export const registerUserMessages = () => {
    const router = getRouter('writeRouter');

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
