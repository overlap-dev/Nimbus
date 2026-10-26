import { Hono } from 'hono';
import { authentication } from '../../../iam/dcb-auth/shell/middleware/hono-auth.ts';
import { routeCommand } from '../../../shared/lib/routing.ts';
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

/**
 * `archive` has no route: its only actor is the settled-archive process
 * manager, which routes the command directly.
 */
export const ticketCommands = new Hono();

ticketCommands.post('/create', authentication(), (c) => {
    return routeCommand<CreateTicketCommand, { ticketId: string }>({
        c,
        type: CREATE_TICKET_COMMAND_TYPE,
    });
});

ticketCommands.post('/assign', authentication(), (c) => {
    return routeCommand<AssignTicketCommand, { ticketId: string }>({
        c,
        type: ASSIGN_TICKET_COMMAND_TYPE,
    });
});

ticketCommands.post('/change-status', authentication(), (c) => {
    return routeCommand<ChangeStatusCommand, { ticketId: string }>({
        c,
        type: CHANGE_STATUS_COMMAND_TYPE,
    });
});
