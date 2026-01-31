import { getLogger } from '@nimbus/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';

export type EventObserver = {
    /**
     * The subject of the events to observe.
     */
    subject: string;
    /**
     * Whether to observe events recursively.
     * Defaults to false.
     */
    recursive?: boolean;
    /**
     * The event handler which will be called when an event is observed.
     *
     * @param event - The EventSourcingDB event that was observed.
     * @returns A promise that resolves when the event has been handled.
     */
    eventHandler: (event: EventSourcingDBEvent) => Promise<void> | void;
};

export const initEventObserver = (eventObserver: EventObserver): void => {
    const eventSourcingDBClient = getEventSourcingDBClient();

    getLogger().debug({
        category: 'Nimbus',
        message: `Observing events for subject "${eventObserver.subject}" ${
            eventObserver.recursive ? 'recursively' : 'non-recursively'
        }`,
    });

    // Run the event observation loop in the background (non-blocking)
    (async () => {
        try {
            for await (
                const event of eventSourcingDBClient.observeEvents(
                    eventObserver.subject,
                    {
                        recursive: eventObserver.recursive ?? false,
                    },
                )
            ) {
                await eventObserver.eventHandler(event);
            }
        } catch (error) {
            getLogger().error({
                category: 'Nimbus',
                message:
                    `Error observing events for subject "${eventObserver.subject}"`,
                error: error as Error,
            });
        }
    })();
};
