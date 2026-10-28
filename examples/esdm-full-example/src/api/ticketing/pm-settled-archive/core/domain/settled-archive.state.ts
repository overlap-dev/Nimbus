import { z } from 'zod';
import {
    TICKET_STATUS_DONE,
    type TicketStatus,
    ticketStatusSchema,
} from '../../../agg-ticket/core/domain/status.value-object.ts';
import { TICKET_ARCHIVED_EVENT_TYPE } from '../../../agg-ticket/core/events/archived.event.ts';
import { TICKET_STATUS_CHANGED_EVENT_TYPE } from '../../../agg-ticket/core/events/status-changed.event.ts';

// State of one settled-archive watch, one per ticket.
//
// applySettledArchive() is the pure reducer, the same idea as
// applyEventToState() on the ticket. The shell loads the previous
// instance, applies one signal, and stores the result.
//
// status-changed to done arms a timer. Leaving done cancels it.
// A repeated status-changed leaves a running timer where it is.
// archived ends the watch and cancels the timer.
//
// The shell's timer later asks isArchiveDue() and, when it is, routes
// the archive command. This file does not route anything.
export const SETTLED_ARCHIVE_STAY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One watch per Ticket, correlated by ticket-id. `archiveDueAt` is the
 * armed archive-due timer; absent while the timer is not armed.
 */
export const settledArchiveInstanceSchema = z.object({
    _id: z.uuid(),
    ticketId: z.uuid(),
    status: ticketStatusSchema,
    archived: z.boolean(),
    archiveDueAt: z.iso.datetime().optional(),
});
export type SettledArchiveState = z.infer<typeof settledArchiveInstanceSchema>;

/** The part of a Ticket event the watch reacts to. */
export type SettledArchiveSignal =
    | {
          type: 'status-changed';
          ticketId: string;
          time: string;
          status: TicketStatus;
      }
    | { type: 'archived'; ticketId: string; time: string };

export const SETTLED_ARCHIVE_EVENT_TYPES = new Set<string>([
    TICKET_STATUS_CHANGED_EVENT_TYPE,
    TICKET_ARCHIVED_EVENT_TYPE,
]);

export type SettledArchiveTicketEvent = {
    type: string;
    time: string;
    data: {
        ticketId: string;
        status?: TicketStatus;
    };
};

export const signalFromTicketEvent = (
    event: SettledArchiveTicketEvent,
): SettledArchiveSignal | null => {
    if (event.type === TICKET_STATUS_CHANGED_EVENT_TYPE) {
        return {
            type: 'status-changed',
            ticketId: event.data.ticketId,
            time: event.time,
            status: event.data.status ?? 'new',
        };
    }

    if (event.type === TICKET_ARCHIVED_EVENT_TYPE) {
        return {
            type: 'archived',
            ticketId: event.data.ticketId,
            time: event.time,
        };
    }

    return null;
};

/** When archive-due fires for a Ticket that entered done at `enteredDoneAt`. */
export const archiveDueFrom = (enteredDoneAt: string): string => {
    return new Date(
        Date.parse(enteredDoneAt) + SETTLED_ARCHIVE_STAY_DAYS * DAY_MS,
    ).toISOString();
};

const withoutTimer = (state: SettledArchiveState): SettledArchiveState => {
    return {
        _id: state.ticketId,
        ticketId: state.ticketId,
        status: state.status,
        archived: state.archived,
    };
};

/**
 * Folds one signal into the watch.
 *
 * status-changed: remember the Status. When it is done and no wait is
 * running, arm archive-due; when it is not done, cancel it. A redelivered
 * status-changed leaves a running wait as it is.
 *
 * archived: mark the Ticket archived and cancel archive-due. The watch is
 * then over (`ticket-archived`).
 */
export const applySettledArchive = (
    state: SettledArchiveState | null,
    signal: SettledArchiveSignal,
): SettledArchiveState => {
    const current: SettledArchiveState = state ?? {
        _id: signal.ticketId,
        ticketId: signal.ticketId,
        status: 'new',
        archived: false,
    };

    if (signal.type === 'archived') {
        return withoutTimer({ ...current, archived: true });
    }

    const next = { ...current, status: signal.status };

    if (next.archived || signal.status !== TICKET_STATUS_DONE) {
        return withoutTimer(next);
    }

    if (current.archiveDueAt !== undefined) {
        return next;
    }

    return { ...withoutTimer(next), archiveDueAt: archiveDueFrom(signal.time) };
};

export const foldSettledArchive = (
    signals: readonly SettledArchiveSignal[],
): SettledArchiveState | null => {
    let state: SettledArchiveState | null = null;

    for (const signal of signals) {
        state = applySettledArchive(state, signal);
    }

    return state;
};

/** Whether the watch is over: an archived Ticket is no longer watched. */
export const isSettledArchiveEnded = (state: SettledArchiveState): boolean => {
    return state.archived;
};

/** Whether archive-due has fired for a Ticket that is still done and not archived. */
export const isArchiveDue = (
    state: SettledArchiveState,
    now: string,
): boolean => {
    if (
        state.archived ||
        state.archiveDueAt === undefined ||
        state.status !== TICKET_STATUS_DONE
    ) {
        return false;
    }

    return Date.parse(state.archiveDueAt) <= Date.parse(now);
};
