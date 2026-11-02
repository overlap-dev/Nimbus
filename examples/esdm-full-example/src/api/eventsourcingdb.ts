import { getEnv } from '@nimbus-cqrs/core';
import {
    type EventObserver,
    setupEventSourcingDBClient,
} from '@nimbus-cqrs/eventsourcingdb';
import { checkpointStore } from './shared/lib/eventsourcingdb/checkpoint-store.ts';
import { ticketsSubject } from './ticketing/agg-ticket/core/domain/ticket.subjects.ts';
import { ticketingNotifyAssigneeConsumer } from './ticketing/agg-ticket/shell/event-handlers/notify-assignee.handler.ts';
import { ticketingStartWorkOnAssignmentConsumer } from './ticketing/agg-ticket/shell/policies/start-work-on-assignment.handler.ts';
import { TICKETING_OBSERVER_NAME } from './ticketing/observer.ts';
import { ticketingSettledArchiveConsumer } from './ticketing/pm-settled-archive/shell/events/settled-archive.handler.ts';
import { ticketingTicketsConsumer } from './ticketing/rm-tickets/shell/projections/tickets.projection.ts';

// EventSourcingDB is also the event bus.
//
// One observer watches the tickets subject, recursively, so it receives
// "/ticketing/tickets/123" as well as the prefix. On startup it replays
// from the lowest consumer checkpoint, then stays live for new events.
//
// Several consumers share that observer. They run in declaration order
// for each event. The tickets read model is first because notify-assignee
// reads the ticket title from the projection of the same event, which it
// declares with dependsOn.
//
// Each consumer's position lives in the checkpoints collection, not on
// the read-model documents. Consumers that are already further ahead skip
// the replayed events in memory.
const EVENT_OBSERVERS: EventObserver[] = [
    {
        name: TICKETING_OBSERVER_NAME,
        subject: ticketsSubject(),
        recursive: true,
        checkpointStore,
        consumers: [
            ticketingTicketsConsumer,
            ticketingNotifyAssigneeConsumer,
            ticketingStartWorkOnAssignmentConsumer,
            ticketingSettledArchiveConsumer,
        ],
    },
];

/**
 * Connect the EventSourcingDB client. Omit observers for one-shot CLIs that
 * only need to write events and then exit.
 */
export const initEventSourcingDBClient = async (
    eventObservers?: EventObserver[],
) => {
    const env = getEnv({
        variables: ['ESDB_URL', 'ESDB_API_TOKEN'],
    });

    await setupEventSourcingDBClient({
        url: new URL(env.ESDB_URL),
        apiToken: env.ESDB_API_TOKEN,
        ...(eventObservers ? { eventObservers } : {}),
    });
};

export const initEventSourcingDB = async () => {
    await initEventSourcingDBClient(EVENT_OBSERVERS);
};
