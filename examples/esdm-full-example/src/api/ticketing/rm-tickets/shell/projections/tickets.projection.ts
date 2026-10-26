import type { Event } from '@nimbus-cqrs/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus-cqrs/eventsourcingdb';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import type { ObserverConsumer } from '../../../../shared/lib/eventsourcingdb/observer-group.ts';
import {
    isTicketsEvent,
    ticketEventSchema,
} from '../../core/domain/tickets.events.ts';
import { applyTicketsProjection } from '../../core/domain/tickets.projection.ts';
import { ticketingTicketsRepository } from '../stores/tickets.repository.ts';

export const handleTicketsProjection = async (
    eventSourcingDBEvent: EventSourcingDBEvent,
): Promise<void> => {
    const event = ticketEventSchema.parse(
        eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent),
    );
    const previous = await ticketingTicketsRepository.getByTicketId(
        event.data.ticketId,
    );
    const next = applyTicketsProjection(previous, event);

    await ticketingTicketsRepository.saveProjection(next);
};

export const TICKETING_TICKETS_CONSUMER_NAME = 'ticketing.tickets';

export const ticketingTicketsConsumer: ObserverConsumer = {
    name: TICKETING_TICKETS_CONSUMER_NAME,
    handles: (event: Event) => {
        return isTicketsEvent(event);
    },
    apply: handleTicketsProjection,
};
