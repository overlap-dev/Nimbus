import type { Event } from '@nimbus-cqrs/core';
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
    writeEvents,
} from '@nimbus-cqrs/eventsourcingdb';
import { isSubjectOnEventId, isSubjectPristine } from 'eventsourcingdb';
import {
    applyEventToState,
    type TicketState,
    ticketEventSchema,
} from '../core/domain/ticket.state.ts';
import { ticketSubject } from '../core/domain/ticket.subjects.ts';

// TODO: integrate into the framework?

// Shared by every command that changes a ticket which already exists.
//
// We read the events of that ticket's subject and fold them with
// applyEventToState() into the current state. We also keep the id of the
// last event. That id is the revision the append will require.
export const replayTicket = async (
    ticketId: string,
): Promise<{
    state: TicketState;
    lastEventId: string | null;
}> => {
    let state: TicketState = null;
    let lastEventId: string | null = null;
    const subject = ticketSubject(ticketId);

    for await (const eventSourcingDBEvent of readEvents(subject, {
        recursive: false,
    })) {
        const event = ticketEventSchema.parse(
            eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
        );
        state = applyEventToState(state, event);
        lastEventId = eventSourcingDBEvent.id;
    }

    return { state, lastEventId };
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
