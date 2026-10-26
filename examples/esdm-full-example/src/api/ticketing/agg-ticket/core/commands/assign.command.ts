import { commandSchema, createEvent } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { actorFromAuthContext } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { requireTicket } from '../domain/ticket.assertions.ts';
import type { TicketState } from '../domain/ticket.state.ts';
import { ticketSubject } from '../domain/ticket.subjects.ts';
import {
    TICKET_ASSIGNED_EVENT_TYPE,
    type TicketAssignedEvent,
} from '../events/assigned.event.ts';

export const ASSIGN_TICKET_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.assign`;

export const assignTicketInputSchema = z.object({
    ticketId: z.uuid(),
    assignee: z.uuid(),
});

export const assignTicketCommandSchema = commandSchema.extend({
    type: z.literal(ASSIGN_TICKET_COMMAND_TYPE),
    data: assignTicketInputSchema,
    authcontext: authContextSchema,
});
export type AssignTicketCommand = z.infer<typeof assignTicketCommandSchema>;

/**
 * Sets or replaces the Assignee. Assigning the current Assignee again
 * changes nothing (`same-assignee-is-a-no-op`).
 */
export const assignTicket = (
    state: TicketState,
    command: AssignTicketCommand,
): TicketAssignedEvent[] => {
    const ticket = requireTicket(state);

    if (ticket.assignee === command.data.assignee) {
        return [];
    }

    const assignedEvent = createEvent<TicketAssignedEvent>({
        source: command.source,
        subject: ticketSubject(command.data.ticketId),
        type: TICKET_ASSIGNED_EVENT_TYPE,
        data: {
            actor: actorFromAuthContext(command.authcontext),
            ticketId: command.data.ticketId,
            assignee: command.data.assignee,
        },
        correlationid: command.correlationid,
    });

    return [assignedEvent];
};
