import {
    type ArchiveTicketCommand,
    archiveTicket,
} from '../../core/commands/archive.command.ts';
import { appendTicketEvents, replayTicket } from '../replay.ts';

/**
 * Replays the Ticket and appends archived. An archived Ticket writes
 * nothing.
 */
export const archiveTicketHandler = async (
    command: ArchiveTicketCommand,
): Promise<{ ticketId: string }> => {
    const { state, lastEventId } = await replayTicket(command.data.ticketId);
    const events = archiveTicket(state, command);

    await appendTicketEvents(command.data.ticketId, events, lastEventId);

    return { ticketId: command.data.ticketId };
};
