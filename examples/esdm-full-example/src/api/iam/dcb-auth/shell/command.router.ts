import { getCommandRouter } from '../../../command.router.ts';
import {
    LOGIN_COMMAND_TYPE,
    loginCommandSchema,
} from '../core/commands/login.command.ts';
import {
    LOGOUT_COMMAND_TYPE,
    logoutCommandSchema,
} from '../core/commands/logout.command.ts';
import { loginHandler } from './commands/login.handler.ts';
import { logoutHandler } from './commands/logout.handler.ts';

export const registerAuthCommands = (): void => {
    const router = getCommandRouter();

    router.register(LOGIN_COMMAND_TYPE, loginHandler, loginCommandSchema);
    router.register(LOGOUT_COMMAND_TYPE, logoutHandler, logoutCommandSchema);
};
