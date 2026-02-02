import { getLogger } from '@nimbus/core';
import type { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { getEventSourcingDBClient } from './client.ts';

type Bound = {
    id: string;
    type: 'inclusive' | 'exclusive';
};

type ObserveFromLatestEvent = {
    subject: string;
    type: string;
    ifEventIsMissing: 'read-everything' | 'wait-for-event';
};

export type RetryOptions = {
    /**
     * The maximum number of retry attempts before giving up.
     * Defaults to 3.
     */
    maxRetries: number;
    /**
     * The initial delay in milliseconds before the first retry.
     * Subsequent retries will use exponential backoff with jitter.
     * Defaults to 1000ms.
     */
    initialRetryDelayMs: number;
};

/**
 * An event observer defines a handler function which will be applied to each event
 * and the options to observe the events according to the EventSourcingDB API.
 *
 * See https://docs.eventsourcingdb.io/getting-started/observing-events for more information.
 */
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
     * The lower bound of the events to observe.
     * Defaults to undefined.
     */
    lowerBound?: Bound;
    /**
     * The from latest event to observe.
     * Defaults to undefined.
     */
    fromLatestEvent?: ObserveFromLatestEvent;
    /**
     * The event handler which will be called when an event is observed.
     *
     * @param event - The EventSourcingDB event that was observed.
     * @returns A promise that resolves when the event has been handled.
     */
    eventHandler: (event: EventSourcingDBEvent) => Promise<void> | void;
    /**
     * Options for retry behavior when the connection fails.
     * Uses exponential backoff with jitter between retries.
     * Defaults to { maxRetries: 3, initialRetryDelayMs: 3000 }.
     */
    retryOptions?: RetryOptions;
};

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

const calculateBackoffDelay = (
    initialDelayMs: number,
    attempt: number,
): number => {
    const baseDelay = initialDelayMs * Math.pow(2, attempt);

    // Add jitter: random value between 0 and 30% of the base delay
    const jitter = Math.random() * baseDelay * 0.3;

    return Math.floor(baseDelay + jitter);
};

const observeWithRetry = async (
    eventObserver: EventObserver,
): Promise<void> => {
    const eventSourcingDBClient = getEventSourcingDBClient();

    const maxRetries = eventObserver.retryOptions?.maxRetries ?? 3;
    const initialRetryDelayMs =
        eventObserver.retryOptions?.initialRetryDelayMs ?? 3000;

    let retryCount = 0;

    let lowerBound: Bound | undefined;
    let fromLatestEvent: ObserveFromLatestEvent | undefined;

    if (eventObserver.lowerBound) {
        lowerBound = eventObserver.lowerBound;
    }

    if (eventObserver.fromLatestEvent) {
        fromLatestEvent = eventObserver.fromLatestEvent;
    }

    while (true) {
        try {
            // Verify connection
            await eventSourcingDBClient.ping();

            // Connection established successfully
            if (retryCount > 0) {
                getLogger().info({
                    category: 'Nimbus',
                    message:
                        `Reconnected event observer for subject "${eventObserver.subject}" after ${retryCount} ${
                            retryCount === 1 ? 'retry' : 'retries'
                        }`,
                    data: {
                        recursive: eventObserver.recursive ?? false,
                        lowerBound,
                        fromLatestEvent,
                    },
                });

                // Reset retry count on successful connection
                retryCount = 0;
            } else {
                getLogger().info({
                    category: 'Nimbus',
                    message:
                        `Observing events for subject "${eventObserver.subject}"`,
                    data: {
                        recursive: eventObserver.recursive ?? false,
                        lowerBound,
                        fromLatestEvent,
                    },
                });
            }

            for await (
                const event of eventSourcingDBClient.observeEvents(
                    eventObserver.subject,
                    {
                        recursive: eventObserver.recursive ?? false,
                        ...(lowerBound ? { lowerBound } : {}),
                        ...(fromLatestEvent ? { fromLatestEvent } : {}),
                    },
                )
            ) {
                await eventObserver.eventHandler(event);

                // Update lowerBound after each event so retries resume from here
                lowerBound = {
                    id: event.id,
                    type: 'exclusive',
                };
                // Clear fromLatestEvent after first event, as we now have a concrete position
                fromLatestEvent = undefined;
            }

            // If the loop completes normally (stream ended), we're done
            return;
        } catch (error) {
            retryCount++;

            if (retryCount > maxRetries) {
                getLogger().critical({
                    category: 'Nimbus',
                    message:
                        `Failed to observe events for subject "${eventObserver.subject}" after ${maxRetries} ${
                            maxRetries === 1 ? 'retry' : 'retries'
                        }.`,
                });
                return;
            }

            const backoffDelay = calculateBackoffDelay(
                initialRetryDelayMs,
                retryCount - 1,
            );

            getLogger().error({
                category: 'Nimbus',
                message:
                    `Error observing events for subject "${eventObserver.subject}" (retry ${retryCount}/${maxRetries}), retrying in ${backoffDelay}ms`,
                error: error as Error,
            });

            // Wait with exponential backoff before retrying
            await delay(backoffDelay);
        }
    }
};

export const initEventObserver = (eventObserver: EventObserver): void => {
    // Run the event observation loop in the background (non-blocking)
    observeWithRetry(eventObserver);
};
