import { commandSchema, createEvent } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { actorFromAuthContext } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import {
    requireDone,
    requireSystemActor,
    requireTicket,
} from '../domain/ticket.assertions.ts';
import type { TicketState } from '../domain/ticket.state.ts';
import { ticketSubject } from '../domain/ticket.subjects.ts';
import {
    TICKET_ARCHIVED_EVENT_TYPE,
    type TicketArchivedEvent,
} from '../events/archived.event.ts';

export const ARCHIVE_TICKET_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.archive`;

export const archiveTicketInputSchema = z.object({
    ticketId: z.uuid(),
});

/**
 * Issued by the settled-archive process manager only, so the authcontext
 * is `null` and the archived event records the actor as system.
 */
export const archiveTicketCommandSchema = commandSchema.extend({
    type: z.literal(ARCHIVE_TICKET_COMMAND_TYPE),
    data: archiveTicketInputSchema,
    authcontext: authContextSchema.nullable(),
});
export type ArchiveTicketCommand = z.infer<typeof archiveTicketCommandSchema>;

/**
 * Archives a Ticket that is done. An archived Ticket is unchanged
 * (`already-archived-is-a-no-op`); a Ticket that is not done is rejected
 * (`only-while-done`).
 */
export const archiveTicket = (
    state: TicketState,
    command: ArchiveTicketCommand,
): TicketArchivedEvent[] => {
    requireSystemActor(command.authcontext);
    const ticket = requireTicket(state);

    if (ticket.archived) {
        return [];
    }

    requireDone(ticket);

    const archivedEvent = createEvent<TicketArchivedEvent>({
        source: command.source,
        subject: ticketSubject(command.data.ticketId),
        type: TICKET_ARCHIVED_EVENT_TYPE,
        data: {
            actor: actorFromAuthContext(command.authcontext),
            ticketId: command.data.ticketId,
        },
        correlationid: command.correlationid,
    });

    return [archivedEvent];
};
