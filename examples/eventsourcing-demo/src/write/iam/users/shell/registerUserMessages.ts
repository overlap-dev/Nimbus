import { getRouter } from '@nimbus/core';
import {
    INVITE_USER_COMMAND_TYPE,
    inviteUserCommandSchema,
} from '../core/commands/inviteUser.command.ts';
import { inviteUserCommandHandler } from './commands/inviteUser.command.ts';

export const registerUserMessages = () => {
    const router = getRouter('writeRouter');

    router.register(
        INVITE_USER_COMMAND_TYPE,
        inviteUserCommandHandler,
        inviteUserCommandSchema,
    );
};
