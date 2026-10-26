import { eventSchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { actorSchema } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';

export const TICKET_CREATED_EVENT_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.created`;

export const ticketCreatedEventDataSchema = z.object({
    actor: actorSchema,
    ticketId: z.uuid(),
    title: z.string(),
    description: z.string().optional(),
    reporter: z.uuid(),
});

export const ticketCreatedEventSchema = eventSchema.extend({
    type: z.literal(TICKET_CREATED_EVENT_TYPE),
    data: ticketCreatedEventDataSchema,
});
export type TicketCreatedEvent = z.infer<typeof ticketCreatedEventSchema>;
