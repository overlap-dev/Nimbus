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

/**
 * Rebuilds the Ticket state from its stream and remembers the last event
 * id for the optimistic append precondition.
 */
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

/**
 * Appends the events to the Ticket stream, guarded by the position the
 * replay saw: pristine for a new Ticket, the last event id otherwise.
 */
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
