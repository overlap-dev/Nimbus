import { messageRouter } from '../../../../shared/shell/messageRouter.ts';
import {
    ADD_USER_COMMAND_TYPE,
    addUserCommandSchema,
} from '../../core/commands/addUser.command.ts';
import { addUserCommandHandler } from './addUser.command.ts';

export const registerUserMessages = () => {
    messageRouter.register(
        ADD_USER_COMMAND_TYPE,
        addUserCommandHandler,
        addUserCommandSchema,
    );
};
