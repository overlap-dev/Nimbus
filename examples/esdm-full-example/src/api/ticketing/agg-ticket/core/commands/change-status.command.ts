import { commandSchema, createEvent } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { actorFromAuthContext } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { ticketStatusSchema } from '../domain/status.value-object.ts';
import {
    requireInProgressHasAssignee,
    requireTicket,
} from '../domain/ticket.assertions.ts';
import type { TicketState } from '../domain/ticket.state.ts';
import { ticketSubject } from '../domain/ticket.subjects.ts';
import {
    TICKET_STATUS_CHANGED_EVENT_TYPE,
    type TicketStatusChangedEvent,
} from '../events/status-changed.event.ts';

export const CHANGE_STATUS_COMMAND_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.change-status`;

export const changeStatusInputSchema = z.object({
    ticketId: z.uuid(),
    status: ticketStatusSchema,
});

export const changeStatusCommandSchema = commandSchema.extend({
    type: z.literal(CHANGE_STATUS_COMMAND_TYPE),
    data: changeStatusInputSchema,
    authcontext: authContextSchema,
});
export type ChangeStatusCommand = z.infer<typeof changeStatusCommandSchema>;

// Moves the ticket to another status.
//
// The ticket has to exist. The current status again changes nothing.
// in-progress requires an assignee. That rule is
// requireInProgressHasAssignee().
export const changeStatus = (
    state: TicketState,
    command: ChangeStatusCommand,
): TicketStatusChangedEvent[] => {
    const ticket = requireTicket(state);

    if (ticket.status === command.data.status) {
        return [];
    }

    requireInProgressHasAssignee(ticket, command.data.status);

    const statusChangedEvent = createEvent<TicketStatusChangedEvent>({
        source: command.source,
        subject: ticketSubject(command.data.ticketId),
        type: TICKET_STATUS_CHANGED_EVENT_TYPE,
        data: {
            actor: actorFromAuthContext(command.authcontext),
            ticketId: command.data.ticketId,
            status: command.data.status,
        },
        correlationid: command.correlationid,
    });

    return [statusChangedEvent];
};
