import { eventSchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { actorSchema } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { ticketStatusSchema } from '../domain/status.value-object.ts';

export const TICKET_STATUS_CHANGED_EVENT_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.status-changed`;

export const ticketStatusChangedEventDataSchema = z.object({
    actor: actorSchema,
    ticketId: z.uuid(),
    status: ticketStatusSchema,
});

export const ticketStatusChangedEventSchema = eventSchema.extend({
    type: z.literal(TICKET_STATUS_CHANGED_EVENT_TYPE),
    data: ticketStatusChangedEventDataSchema,
});
export type TicketStatusChangedEvent = z.infer<
    typeof ticketStatusChangedEventSchema
>;
