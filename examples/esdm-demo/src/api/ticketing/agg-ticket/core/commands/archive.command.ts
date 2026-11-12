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
    // Stream head the settled-archive timer was checked against. The
    // handler writes only while the ticket is still on this event.
    observedEventId: z.string().min(1),
});

// Issued by the settled-archive process manager only.
// The auth context is null, and the archived event records the actor
// as system. A signed-in user cannot send this command.
export const archiveTicketCommandSchema = commandSchema.extend({
    type: z.literal(ARCHIVE_TICKET_COMMAND_TYPE),
    data: archiveTicketInputSchema,
    authcontext: authContextSchema.nullable(),
});
export type ArchiveTicketCommand = z.infer<typeof archiveTicketCommandSchema>;

// Archives a ticket that is done.
//
// requireSystemActor() rejects a user auth context. An archived ticket
// is unchanged, so we return no events. A ticket that is not done is
// rejected by requireDone().
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
