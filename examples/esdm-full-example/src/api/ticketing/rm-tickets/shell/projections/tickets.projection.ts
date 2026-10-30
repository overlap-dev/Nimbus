import type { Event } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import type { ObserverConsumer } from '../../../../shared/lib/eventsourcingdb/observer-group.ts';
import { ticketEventSchema } from '../../../agg-ticket/core/domain/ticket.state.ts';
import { isTicketsEvent } from '../../core/domain/tickets.events.ts';
import { applyTicketsProjection } from '../../core/domain/tickets.projection.ts';
import { ticketingTicketsRepository } from '../stores/tickets.repository.ts';

// Here we define the "tickets" projection.
//
// It is one consumer of the EventSourcingDB observer for the tickets
// subject. The observer is wired in eventsourcingdb.ts. Every event on
// that subject is offered to the consumers of the group, in order.
//
// The read model uses the same core and shell split as the write side.
// applyTicketsProjection() in the core is a pure fold: previous document and
// one event in, next document out. This shell only does the I/O around it.
//
// - Load the document for this ticket, if one exists yet
// - Call the core reducer
// - Save the resulting document
//
// The fold can then be unit tested without a database.
//
// GIVEN: document = A
//   AND: event = B
// WHEN: applyTicketsProjection(document, event)
// THEN: document C
//
// get-ticket and list-tickets both read this projection.
//
// How far the projection has read is not stored on the ticket document.
// The observer group keeps a checkpoint per consumer. See
// createObserverGroup() in observer-group.ts.

export const handleTicketsProjection = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
): Promise<void> => {
    // The observer hands us a raw EventSourcingDB event.
    // Convert it back to a Nimbus event and check the ticket schema.
    const event = ticketEventSchema.parse(
        eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
    );

    // created has no document yet. Later events load the one we stored.
    const previous = await ticketingTicketsRepository.getByTicketId(
        event.data.ticketId,
    );

    const next = applyTicketsProjection(previous, event);

    await ticketingTicketsRepository.saveProjection(next);
};

// The name is the checkpoint key. It has to stay stable. Renaming it makes
// this consumer replay the subject from the beginning.
export const TICKETING_TICKETS_CONSUMER_NAME = 'ticketing.tickets';

// handles() skips events this projection does not fold.
// apply() is the shell function above.
export const ticketingTicketsConsumer: ObserverConsumer = {
    name: TICKETING_TICKETS_CONSUMER_NAME,
    handles: (event: Event) => {
        return isTicketsEvent(event);
    },
    apply: handleTicketsProjection,
};
