import {
    type AssignTicketCommand,
    assignTicket,
} from '../../core/commands/assign.command.ts';
import { appendTicketEvents, replayTicket } from '../replay.ts';

/**
 * Replays the Ticket and appends assigned.
 */
export const assignTicketHandler = async (
    command: AssignTicketCommand,
): Promise<{ ticketId: string }> => {
    const { state, lastEventId } = await replayTicket(command.data.ticketId);
    const events = assignTicket(state, command);

    await appendTicketEvents(command.data.ticketId, events, lastEventId);

    return { ticketId: command.data.ticketId };
};
