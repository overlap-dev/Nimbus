import {
    type ArchiveTicketCommand,
    archiveTicket,
} from '../../core/commands/archive.command.ts';
import { appendTicketEvents, replayTicket } from '../replay.ts';

// Same shell shape as assign. An already archived ticket makes the core
// return no events, and appendTicketEvents() then writes nothing.
//
// observedEventId is the stream head the process manager validated the
// timer against. A newer event means that decision is stale, so this
// returns without writing. The append still preconditions on the head
// this replay saw.
export const archiveTicketHandler = async (
    command: ArchiveTicketCommand,
): Promise<{ ticketId: string }> => {
    const { state, lastEventId } = await replayTicket(command.data.ticketId);

    if (lastEventId !== command.data.observedEventId) {
        return { ticketId: command.data.ticketId };
    }

    const events = archiveTicket(state, command);

    await appendTicketEvents(command.data.ticketId, events, lastEventId);

    return { ticketId: command.data.ticketId };
};
