import type { Event } from '@nimbus-cqrs/core';
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
    writeEvents,
} from '@nimbus-cqrs/eventsourcingdb';
import { isSubjectOnEventId, isSubjectPristine } from 'eventsourcingdb';
import {
    TICKET_STATUS_DONE,
    type TicketStatus,
} from '../core/domain/status.value-object.ts';
import {
    applyEventToState,
    type TicketState,
    ticketEventSchema,
} from '../core/domain/ticket.state.ts';
import { ticketSubject } from '../core/domain/ticket.subjects.ts';
import { TICKET_ARCHIVED_EVENT_TYPE } from '../core/events/archived.event.ts';
import { TICKET_STATUS_CHANGED_EVENT_TYPE } from '../core/events/status-changed.event.ts';

// TODO: integrate into the framework?

// Shared by every command that changes a ticket which already exists.
//
// We read the events of that ticket's subject and fold them with
// applyEventToState() into the current state. We also keep the id of the
// last event. That id is the revision the append will require.
//
// enteredDoneAt is the time of the status-changed that last moved the
// ticket into done. A later status-changed that stays on done does not
// move it. settled-archive uses it to tell a current timer from a stale
// one. Other commands ignore it.
export const replayTicket = async (
    ticketId: string,
): Promise<{
    state: TicketState;
    lastEventId: string | null;
    enteredDoneAt: string | null;
}> => {
    let state: TicketState = null;
    let lastEventId: string | null = null;
    let status: TicketStatus | null = null;
    let enteredDoneAt: string | null = null;
    const subject = ticketSubject(ticketId);

    for await (const eventSourcingDBEvent of readEvents(subject, {
        recursive: false,
    })) {
        const event = ticketEventSchema.parse(
            eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
        );
        state = applyEventToState(state, event);
        lastEventId = eventSourcingDBEvent.id;

        if (event.type === TICKET_STATUS_CHANGED_EVENT_TYPE) {
            if (
                event.data.status === TICKET_STATUS_DONE &&
                status !== TICKET_STATUS_DONE
            ) {
                enteredDoneAt = event.time;
            } else if (event.data.status !== TICKET_STATUS_DONE) {
                enteredDoneAt = null;
            }
        } else if (event.type === TICKET_ARCHIVED_EVENT_TYPE) {
            enteredDoneAt = null;
        }

        status = state?.status ?? null;
    }

    return { state, lastEventId, enteredDoneAt };
};

// Persist the events the core produced.
//
// The precondition is the position the replay saw.
// A subject with no events yet must still be pristine.
// A subject that already has events must still be on the last event id
// we read. If another command wrote in between, EventSourcingDB rejects
// the write. The caller then has to replay and try again.
//
// An empty list is a no-op. The core returns one when the command
// changes nothing, and we do not touch the stream.
export const appendTicketEvents = async (
    ticketId: string,
    events: Event[],
    lastEventId: string | null,
): Promise<void> => {
    if (events.length === 0) {
        return;
    }

    const subject = ticketSubject(ticketId);
    const precondition =
        lastEventId === null
            ? isSubjectPristine(subject)
            : isSubjectOnEventId(subject, lastEventId);

    await writeEvents(events, [precondition]);
};
