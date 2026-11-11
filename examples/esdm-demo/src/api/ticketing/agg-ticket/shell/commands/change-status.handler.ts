import {
    type ChangeStatusCommand,
    changeStatus,
} from '../../core/commands/change-status.command.ts';
import { appendTicketEvents, replayTicket } from '../replay.ts';

// Same shell shape as assign: replay, run the core, append on the
// revision the replay saw. See replay.ts.
export const changeStatusHandler = async (
    command: ChangeStatusCommand,
): Promise<{ ticketId: string }> => {
    const { state, lastEventId } = await replayTicket(command.data.ticketId);
    const events = changeStatus(state, command);

    await appendTicketEvents(command.data.ticketId, events, lastEventId);

    return { ticketId: command.data.ticketId };
};
