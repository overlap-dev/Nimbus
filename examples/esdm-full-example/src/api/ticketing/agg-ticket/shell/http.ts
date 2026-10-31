import { routeCommand } from '@nimbus-cqrs/hono';
import { Hono } from 'hono';
import { getCommandRouter } from '../../../command.router.ts';
import {
    authentication,
    getAuthContext,
} from '../../../iam/dcb-auth/shell/middleware/hono-auth.ts';
import { CLOUDEVENTS_SOURCE } from '../../../shared/namespace.ts';
import {
    ASSIGN_TICKET_COMMAND_TYPE,
    type AssignTicketCommand,
} from '../core/commands/assign.command.ts';
import {
    CHANGE_STATUS_COMMAND_TYPE,
    type ChangeStatusCommand,
} from '../core/commands/change-status.command.ts';
import {
    CREATE_TICKET_COMMAND_TYPE,
    type CreateTicketCommand,
} from '../core/commands/create.command.ts';

// This is where the HTTP API meets the ticket commands.
//
// The route does not contain business logic. routeCommand() builds the
// typed command, the router validates it against the registered schema,
// and the shell handler runs.
//
// The auth context comes from the authentication middleware and is passed
// as an extension attribute on the command.
//
// archive has no HTTP route. Only the settled-archive process manager routes
// that command, and it does so directly on the command router.
export const ticketCommands = new Hono();

ticketCommands.post('/create', authentication(), (c) => {
    return routeCommand<CreateTicketCommand, { ticketId: string }>({
        c,
        router: getCommandRouter(),
        source: CLOUDEVENTS_SOURCE,
        type: CREATE_TICKET_COMMAND_TYPE,
        extensions: { authcontext: getAuthContext(c) },
    });
});

ticketCommands.post('/assign', authentication(), (c) => {
    return routeCommand<AssignTicketCommand, { ticketId: string }>({
        c,
        router: getCommandRouter(),
        source: CLOUDEVENTS_SOURCE,
        type: ASSIGN_TICKET_COMMAND_TYPE,
        extensions: { authcontext: getAuthContext(c) },
    });
});

ticketCommands.post('/change-status', authentication(), (c) => {
    return routeCommand<ChangeStatusCommand, { ticketId: string }>({
        c,
        router: getCommandRouter(),
        source: CLOUDEVENTS_SOURCE,
        type: CHANGE_STATUS_COMMAND_TYPE,
        extensions: { authcontext: getAuthContext(c) },
    });
});
