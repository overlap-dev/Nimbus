import {
    type ArchiveTicketCommand,
    archiveTicket,
} from '../../core/commands/archive.command.ts';
import { appendTicketEvents, replayTicket } from '../replay.ts';

// Same shell shape as assign. An already archived ticket makes the core
// return no events, and appendTicketEvents() then writes nothing.
export const archiveTicketHandler = async (
    command: ArchiveTicketCommand,
): Promise<{ ticketId: string }> => {
    const { state, lastEventId } = await replayTicket(command.data.ticketId);
    const events = archiveTicket(state, command);

    await appendTicketEvents(command.data.ticketId, events, lastEventId);

    return { ticketId: command.data.ticketId };
};
