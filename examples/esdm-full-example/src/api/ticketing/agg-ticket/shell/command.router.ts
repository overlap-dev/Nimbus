import { getCommandRouter } from '../../../command.router.ts';
import {
    ARCHIVE_TICKET_COMMAND_TYPE,
    archiveTicketCommandSchema,
} from '../core/commands/archive.command.ts';
import {
    ASSIGN_TICKET_COMMAND_TYPE,
    assignTicketCommandSchema,
} from '../core/commands/assign.command.ts';
import {
    CHANGE_STATUS_COMMAND_TYPE,
    changeStatusCommandSchema,
} from '../core/commands/change-status.command.ts';
import {
    CREATE_TICKET_COMMAND_TYPE,
    createTicketCommandSchema,
} from '../core/commands/create.command.ts';
import { archiveTicketHandler } from './commands/archive.handler.ts';
import { assignTicketHandler } from './commands/assign.handler.ts';
import { changeStatusHandler } from './commands/change-status.handler.ts';
import { createTicketHandler } from './commands/create.handler.ts';

// Register every command of the ticket aggregate.
//
// The type selects the handler. The schema validates the input
// before the handler runs. archive is registered here even though
// it has no HTTP route. The process manager routes it by type.
export const registerTicketCommands = (): void => {
    const router = getCommandRouter();

    router.register(
        CREATE_TICKET_COMMAND_TYPE,
        createTicketHandler,
        createTicketCommandSchema,
    );
    router.register(
        ASSIGN_TICKET_COMMAND_TYPE,
        assignTicketHandler,
        assignTicketCommandSchema,
    );
    router.register(
        CHANGE_STATUS_COMMAND_TYPE,
        changeStatusHandler,
        changeStatusCommandSchema,
    );
    router.register(
        ARCHIVE_TICKET_COMMAND_TYPE,
        archiveTicketHandler,
        archiveTicketCommandSchema,
    );
};
