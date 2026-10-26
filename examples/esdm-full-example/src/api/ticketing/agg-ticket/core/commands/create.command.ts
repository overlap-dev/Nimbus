import { commandSchema, createEvent } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { actorFromAuthContext } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { requireNoTicket } from '../domain/ticket.assertions.ts';
import type { TicketState } from '../domain/ticket.state.ts';
import { ticketSubject } from '../domain/ticket.subjects.ts';
import {
    TICKET_CREATED_EVENT_TYPE,
    type TicketCreatedEvent,
} from '../events/created.event.ts';

export const CREATE_TICKET_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.create`;

export const createTicketInputSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
});

export const createTicketCommandSchema = commandSchema.extend({
    type: z.literal(CREATE_TICKET_COMMAND_TYPE),
    data: createTicketInputSchema,
    authcontext: authContextSchema,
});
export type CreateTicketCommand = z.infer<typeof createTicketCommandSchema>;

/**
 * Opens a Ticket on behalf of the acting User, who becomes the Reporter.
 * The Ticket starts unassigned, in Status new, and not archived
 * (`starts-new`, `starts-not-archived`).
 */
export const createTicket = (
    state: TicketState,
    command: CreateTicketCommand,
    ticketId: string,
): [TicketCreatedEvent] => {
    requireNoTicket(state);

    const ticketCreatedEvent = createEvent<TicketCreatedEvent>({
        source: command.source,
        subject: ticketSubject(ticketId),
        type: TICKET_CREATED_EVENT_TYPE,
        data: {
            actor: actorFromAuthContext(command.authcontext),
            ticketId,
            title: command.data.title,
            ...(command.data.description !== undefined
                ? { description: command.data.description }
                : {}),
            reporter: command.authcontext.userId,
        },
        correlationid: command.correlationid,
    });

    return [ticketCreatedEvent];
};
