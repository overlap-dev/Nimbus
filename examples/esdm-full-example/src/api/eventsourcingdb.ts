import { getEnv } from '@nimbus-cqrs/core';
import {
    type EventObserver,
    setupEventSourcingDBClient,
} from '@nimbus-cqrs/eventsourcingdb';
import { observerCheckpointsRepository } from './shared/lib/eventsourcingdb/observer-checkpoints.repository.ts';
import { createObserverGroup } from './shared/lib/eventsourcingdb/observer-group.ts';
import { ticketsSubject } from './ticketing/agg-ticket/core/domain/ticket.subjects.ts';
import { ticketingNotifyAssigneeConsumer } from './ticketing/agg-ticket/shell/event-handlers/notify-assignee.handler.ts';
import { ticketingStartWorkOnAssignmentConsumer } from './ticketing/agg-ticket/shell/policies/start-work-on-assignment.handler.ts';
import { ticketingSettledArchiveConsumer } from './ticketing/pm-settled-archive/shell/events/settled-archive.handler.ts';
import { ticketingTicketsConsumer } from './ticketing/rm-tickets/shell/projections/tickets.projection.ts';

// TODO: We need to think about the projections pattern to integrate it into the framework.

// EventSourcingDB is also the event bus.
//
// One observer watches the tickets subject, recursively, so it receives
// "/ticketing/tickets/123" as well as the prefix. On startup it replays
// from the group's lower bound, then stays live for new events.
//
// Several consumers share that observer. They run in declaration order
// for each event. The tickets read model is first because notify-assignee
// reads the ticket title from the projection of the same event.
//
// The lower bound and each consumer's position live in the
// observer_checkpoints collection, not on the read-model documents.
// createObserverGroup() loads those checkpoints and resumes from the
// earliest one. Consumers that are already further ahead skip the
// replayed events in memory.
const OBSERVER_GROUPS = [
    {
        subject: ticketsSubject(),
        recursive: true,
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
    const eventObservers = await Promise.all(
        OBSERVER_GROUPS.map(async (group) => {
            return {
                subject: group.subject,
                recursive: group.recursive,
                ...(await createObserverGroup({
                    groupName: group.subject,
                    consumers: group.consumers,
                    checkpoints: observerCheckpointsRepository,
                })),
            };
        }),
    );

    await initEventSourcingDBClient(eventObservers);
};
