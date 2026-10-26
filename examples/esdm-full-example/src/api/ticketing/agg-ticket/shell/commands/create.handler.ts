import { newUuidV4 } from '../../../../shared/lib/crypto/uuid.ts';
import { isWriteConflict } from '../../../../shared/lib/eventsourcingdb/isWriteConflict.ts';
import {
    type CreateTicketCommand,
    createTicket,
} from '../../core/commands/create.command.ts';
import { ticketAlreadyExistsException } from '../../core/domain/ticket.exceptions.ts';
import { appendTicketEvents } from '../replay.ts';

/**
 * Assigns the ticket-id and appends created. A pristine-subject conflict
 * means that Ticket id is already taken.
 */
export const createTicketHandler = async (
    command: CreateTicketCommand,
): Promise<{ ticketId: string }> => {
    const ticketId = newUuidV4();
    const events = createTicket(null, command, ticketId);

    try {
        await appendTicketEvents(ticketId, events, null);
    } catch (error) {
        if (isWriteConflict(error)) {
            throw ticketAlreadyExistsException();
        }

        throw error;
    }

    return { ticketId };
};
