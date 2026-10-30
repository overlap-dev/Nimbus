import { TICKET_STATUS_NEW } from '../../../agg-ticket/core/domain/status.value-object.ts';
import type { TicketEvent } from '../../../agg-ticket/core/domain/ticket.state.ts';
import { TICKET_ARCHIVED_EVENT_TYPE } from '../../../agg-ticket/core/events/archived.event.ts';
import { TICKET_ASSIGNED_EVENT_TYPE } from '../../../agg-ticket/core/events/assigned.event.ts';
import { TICKET_CREATED_EVENT_TYPE } from '../../../agg-ticket/core/events/created.event.ts';
import { TICKET_STATUS_CHANGED_EVENT_TYPE } from '../../../agg-ticket/core/events/status-changed.event.ts';
import type { TicketsDocument } from './tickets.ts';

const requireTicket = (
    document: TicketsDocument | null,
    ticketId: string,
): TicketsDocument => {
    if (document === null) {
        throw new Error(`Ticket ${ticketId} is missing from the projection`);
    }

    return document;
};

// Pure reducer for the tickets read model.
//
// One ticket event in, the next document for that ticket out.
// No database access. The shell loads the previous document and stores
// whatever this function returns.
//
// created starts the document. Every later event updates the document
// that created already produced. A later event with no document means
// the stream for that ticket is missing its beginning.
export const applyTicketsProjection = (
    document: TicketsDocument | null,
    event: TicketEvent,
): TicketsDocument => {
    if (event.type === TICKET_CREATED_EVENT_TYPE) {
        return {
            _id: event.data.ticketId,
            ticketId: event.data.ticketId,
            title: event.data.title,
            ...(event.data.description !== undefined
                ? { description: event.data.description }
                : {}),
            reporter: event.data.reporter,
            status: TICKET_STATUS_NEW,
            archived: false,
            createdAt: event.time,
            updatedAt: event.time,
        };
    }

    const ticket = {
        ...requireTicket(document, event.data.ticketId),
        updatedAt: event.time,
    };

    if (event.type === TICKET_ASSIGNED_EVENT_TYPE) {
        return { ...ticket, assignee: event.data.assignee };
    }

    if (event.type === TICKET_STATUS_CHANGED_EVENT_TYPE) {
        return { ...ticket, status: event.data.status };
    }

    if (event.type === TICKET_ARCHIVED_EVENT_TYPE) {
        return { ...ticket, archived: true };
    }

    const unexpected: never = event;
    throw new Error(`Unexpected Ticket event ${unexpected}`);
};
