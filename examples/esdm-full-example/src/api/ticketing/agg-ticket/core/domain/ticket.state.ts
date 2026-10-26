import { z } from 'zod';
import {
    TICKET_ARCHIVED_EVENT_TYPE,
    ticketArchivedEventSchema,
} from '../events/archived.event.ts';
import {
    TICKET_ASSIGNED_EVENT_TYPE,
    ticketAssignedEventSchema,
} from '../events/assigned.event.ts';
import {
    TICKET_CREATED_EVENT_TYPE,
    ticketCreatedEventSchema,
} from '../events/created.event.ts';
import {
    TICKET_STATUS_CHANGED_EVENT_TYPE,
    ticketStatusChangedEventSchema,
} from '../events/status-changed.event.ts';
import {
    TICKET_STATUS_NEW,
    ticketStatusSchema,
} from './status.value-object.ts';

/**
 * The Ticket aggregate state, folded from its events.
 */
export const ticketSchema = z.object({
    ticketId: z.uuid(),
    title: z.string(),
    description: z.string().optional(),
    reporter: z.uuid(),
    assignee: z.uuid().optional(),
    status: ticketStatusSchema,
    archived: z.boolean(),
});
export type Ticket = z.infer<typeof ticketSchema>;

/** `null` until the Ticket is created. */
export type TicketState = Ticket | null;

export const ticketEventSchema = z.union([
    ticketCreatedEventSchema,
    ticketAssignedEventSchema,
    ticketStatusChangedEventSchema,
    ticketArchivedEventSchema,
]);
export type TicketEvent = z.infer<typeof ticketEventSchema>;

/**
 * Folds one event into the Ticket state. Pure; the shell replays the
 * stream through it.
 */
export const applyEventToState = (
    state: TicketState,
    event: TicketEvent,
): TicketState => {
    if (event.type === TICKET_CREATED_EVENT_TYPE) {
        return {
            ticketId: event.data.ticketId,
            title: event.data.title,
            ...(event.data.description !== undefined
                ? { description: event.data.description }
                : {}),
            reporter: event.data.reporter,
            status: TICKET_STATUS_NEW,
            archived: false,
        };
    }

    if (state === null) {
        throw new Error('Ticket event requires a created Ticket');
    }

    if (event.type === TICKET_ASSIGNED_EVENT_TYPE) {
        return {
            ...state,
            assignee: event.data.assignee,
        };
    }

    if (event.type === TICKET_STATUS_CHANGED_EVENT_TYPE) {
        return {
            ...state,
            status: event.data.status,
        };
    }

    if (event.type === TICKET_ARCHIVED_EVENT_TYPE) {
        return {
            ...state,
            archived: true,
        };
    }

    const unexpected: never = event;
    throw new Error(`Unexpected Ticket event ${unexpected}`);
};
