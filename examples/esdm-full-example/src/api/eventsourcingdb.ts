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

// Consumers run in declaration order per event. The tickets read model comes
// first because notify-assignee reads the Ticket title from it.
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
