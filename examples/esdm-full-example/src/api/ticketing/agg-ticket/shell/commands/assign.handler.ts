import {
    type AssignTicketCommand,
    assignTicket,
} from '../../core/commands/assign.command.ts';
import { appendTicketEvents, replayTicket } from '../replay.ts';

// Same shell shape as create, for a ticket that already exists.
//
// replayTicket() rebuilds the state. assignTicket() decides the events.
// appendTicketEvents() writes them only if the ticket is still at the
// revision the replay saw. See replay.ts.
export const assignTicketHandler = async (
    command: AssignTicketCommand,
): Promise<{ ticketId: string }> => {
    const { state, lastEventId } = await replayTicket(command.data.ticketId);
    const events = assignTicket(state, command);

    await appendTicketEvents(command.data.ticketId, events, lastEventId);

    return { ticketId: command.data.ticketId };
};
