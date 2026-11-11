import { writeEvents } from '@nimbus-cqrs/eventsourcingdb';
import { isSubjectPristine } from 'eventsourcingdb';
import { newUuidV4 } from '../../../../shared/lib/crypto/uuid.ts';
import { isWriteConflict } from '../../../../shared/lib/eventsourcingdb/isWriteConflict.ts';
import {
    type CreateTicketCommand,
    createTicket,
} from '../../core/commands/create.command.ts';
import { ticketAlreadyExistsException } from '../../core/domain/ticket.exceptions.ts';
import type { TicketState } from '../../core/domain/ticket.state.ts';
import { ticketSubject } from '../../core/domain/ticket.subjects.ts';

// This is the handler for the create ticket command.
// We place the handler in the shell as it coordinates all the side effectful operations.
//
// The general purpose of the handler is to:
// - Get the current state
// - Call the core logic with the current state and the command
// - Write the resulting events to the event store
// - Return some result to the caller
//
export const createTicketHandler = async (
    command: CreateTicketCommand,
): Promise<{ ticketId: string }> => {
    // We usually replay the aggregates events to get the current state.
    // In this case we assume the the creation is the beginning of the use case
    // and we have an empty initial state.
    const state: TicketState = null;

    const ticketId = newUuidV4();

    // We call the core logic with the initial state and the command data.
    const events = createTicket(state, command, ticketId);

    // We persist the events the core logic produced.
    // By using the ESDB preconditions we can ensure the integrity of the event store.
    // Here we need to make sure the subject is pristine, meaning that no other
    // ticket with this id exists.
    //
    // In case this precondition is not met, we throw an explicit exception.
    try {
        const subject = ticketSubject(ticketId);
        await writeEvents(events, [isSubjectPristine(subject)]);
    } catch (error) {
        if (isWriteConflict(error)) {
            throw ticketAlreadyExistsException();
        }

        throw error;
    }

    return { ticketId };
};
