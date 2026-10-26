import { eventSchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { actorSchema } from '../../../../shared/lib/messages.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';

export const TICKET_ARCHIVED_EVENT_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.ticket.archived`;

export const ticketArchivedEventDataSchema = z.object({
    actor: actorSchema,
    ticketId: z.uuid(),
});

export const ticketArchivedEventSchema = eventSchema.extend({
    type: z.literal(TICKET_ARCHIVED_EVENT_TYPE),
    data: ticketArchivedEventDataSchema,
});
export type TicketArchivedEvent = z.infer<typeof ticketArchivedEventSchema>;
