import { eventSchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { actorSchema } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';

export const TICKET_ASSIGNED_EVENT_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.assigned`;

export const ticketAssignedEventDataSchema = z.object({
    actor: actorSchema,
    ticketId: z.uuid(),
    assignee: z.uuid(),
});

export const ticketAssignedEventSchema = eventSchema.extend({
    type: z.literal(TICKET_ASSIGNED_EVENT_TYPE),
    data: ticketAssignedEventDataSchema,
});
export type TicketAssignedEvent = z.infer<typeof ticketAssignedEventSchema>;
