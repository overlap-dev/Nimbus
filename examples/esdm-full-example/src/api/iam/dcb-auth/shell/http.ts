import { Hono } from 'hono';
import {
    routeCommand,
    routePublicCommand,
} from '../../../shared/lib/routing.ts';
import {
    LOGIN_COMMAND_TYPE,
    type LoginCommand,
} from '../core/commands/login.command.ts';
import {
    LOGOUT_COMMAND_TYPE,
    type LogoutCommand,
} from '../core/commands/logout.command.ts';
import type { SessionState } from '../core/domain/session.state.ts';
import { authentication } from './middleware/hono-auth.ts';

export const authCommands = new Hono();

authCommands.post('/login', (c) => {
    return routePublicCommand<LoginCommand, SessionState>({
        c,
        type: LOGIN_COMMAND_TYPE,
    });
});

authCommands.post('/logout', authentication(), (c) => {
    return routeCommand<LogoutCommand, void>({
        c,
        type: LOGOUT_COMMAND_TYPE,
    });
});
