import { routeCommand } from '@nimbus-cqrs/hono';
import { Hono } from 'hono';
import { getCommandRouter } from '../../../command.router.ts';
import { CLOUDEVENTS_SOURCE } from '../../../shared/namespace.ts';
import {
    LOGIN_COMMAND_TYPE,
    type LoginCommand,
} from '../core/commands/login.command.ts';
import {
    LOGOUT_COMMAND_TYPE,
    type LogoutCommand,
} from '../core/commands/logout.command.ts';
import type { SessionState } from '../core/domain/session.state.ts';
import { authentication, getAuthContext } from './middleware/hono-auth.ts';

export const authCommands = new Hono();

authCommands.post('/login', (c) => {
    return routeCommand<LoginCommand, SessionState>({
        c,
        router: getCommandRouter(),
        source: CLOUDEVENTS_SOURCE,
        type: LOGIN_COMMAND_TYPE,
    });
});

authCommands.post('/logout', authentication(), (c) => {
    return routeCommand<LogoutCommand, void>({
        c,
        router: getCommandRouter(),
        source: CLOUDEVENTS_SOURCE,
        type: LOGOUT_COMMAND_TYPE,
        extensions: { authcontext: getAuthContext(c) },
    });
});
