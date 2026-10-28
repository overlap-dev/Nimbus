import {
    type TicketEvent,
    ticketEventSchema,
} from '../../../agg-ticket/core/domain/ticket.state.ts';
import { TICKET_ARCHIVED_EVENT_TYPE } from '../../../agg-ticket/core/events/archived.event.ts';
import { TICKET_ASSIGNED_EVENT_TYPE } from '../../../agg-ticket/core/events/assigned.event.ts';
import { TICKET_CREATED_EVENT_TYPE } from '../../../agg-ticket/core/events/created.event.ts';
import { TICKET_STATUS_CHANGED_EVENT_TYPE } from '../../../agg-ticket/core/events/status-changed.event.ts';

export { type TicketEvent, ticketEventSchema };

// The events this read model folds.
//
// The observer delivers every event on the tickets subject. handles()
// on the consumer uses isTicketsEvent, so anything else on that subject
// is skipped and does not change a document.
export const TICKETS_EVENT_TYPES = new Set<string>([
    TICKET_CREATED_EVENT_TYPE,
    TICKET_ASSIGNED_EVENT_TYPE,
    TICKET_STATUS_CHANGED_EVENT_TYPE,
    TICKET_ARCHIVED_EVENT_TYPE,
]);

export const isTicketsEvent = (event: {
    type: string;
}): event is TicketEvent => {
    return TICKETS_EVENT_TYPES.has(event.type);
};
