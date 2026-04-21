import { GenericException, getLogger } from '@nimbus-cqrs/core';
import { Client } from 'eventsourcingdb';
import { type EventObserver, initEventObserver } from './eventObserver.ts';

let eventSourcingDBClient: Client | null = null;

/**
 * Configuration options for setting up the EventSourcingDB client.
 */
export type SetupEventSourcingDBClientInput = {
    /**
     * The URL of the EventSourcingDB server.
     */
    url: URL;
    /**
     * The API token for authenticating with EventSourcingDB.
     */
    apiToken: string;
    /**
     * An optional array of event observers to observe events.
     */
    eventObservers?: EventObserver[];
};

/**
 * Initialize and configure the EventSourcingDB client.
 *
 * This function creates a singleton client instance, verifies connectivity by pinging
 * the server, and validates the provided API token. It should be called once at
 * application startup before using {@link getEventSourcingDBClient}.
 *
 * Optionally, you can provide event observers that will start observing events
 * in the background after the client is initialized.
 *
 * @param {SetupEventSourcingDBClientInput} options - The configuration options
 * @param {URL} options.url - The URL of the EventSourcingDB server
 * @param {string} options.apiToken - The API token for authentication
 * @param {EventObserver[]} [options.eventObservers] - Optional array of event observers
 *
 * @throws {GenericException} If the connection to EventSourcingDB fails
 * @throws {GenericException} If the API token is invalid
 *
 * @example
 * ```ts
 * import { setupEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
 * import type { Event } from 'eventsourcingdb';
 *
 * await setupEventSourcingDBClient({
 *     url: new URL(process.env.ESDB_URL ?? ''),
 *     apiToken: process.env.ESDB_API_TOKEN ?? '',
 *     eventObservers: [
 *         {
 *             subject: '/users',
 *             recursive: true,
 *             lowerBound: {
 *                 id: 'last-processed-event-id',
 *                 type: 'exclusive',
 *             },
 *             fromLatestEvent: {
 *                 subject: '/users',
 *                 type: 'io.nimbus.users.invited',
 *                 ifEventIsMissing: 'read-everything',
 *             },
 *             eventHandler: async (event: Event) => {
 *                 console.log('Received event:', event);
 *             },
 *             retryOptions: {
 *                 maxRetries: 3,
 *                 initialRetryDelayMs: 3000,
 *             },
 *         },
 *     ],
 * });
 * ```
 */
export const setupEventSourcingDBClient = async (
    { url, apiToken, eventObservers }: SetupEventSourcingDBClientInput,
): Promise<void> => {
    eventSourcingDBClient = new Client(
        url,
        apiToken,
    );

    try {
        await eventSourcingDBClient.ping();
    } catch (error) {
        getLogger().critical({
            category: 'Nimbus',
            message: 'Could not connect to EventSourcingDB',
            error: error as Error,
        });
        throw new GenericException(
            'Could not connect to EventSourcingDB',
        );
    }

    try {
        await eventSourcingDBClient.verifyApiToken();
    } catch (error) {
        getLogger().error({
            category: 'Nimbus',
            message: 'Invalid API token. Please check your API token.',
            error: error as Error,
        });
        throw new GenericException(
            'Invalid API token. Please check your API token.',
        );
    }

    getLogger().info({
        category: 'Nimbus',
        message: 'EventSourcingDB client initialized successfully',
    });

    if (eventObservers?.length) {
        for (const eventObserver of eventObservers) {
            initEventObserver(eventObserver);
        }
    }
};

/**
 * Get the EventSourcingDB client instance.
 *
 * Returns the singleton client instance that was created by {@link setupEventSourcingDBClient}.
 * This function must be called after the client has been initialized.
 *
 * @returns {Client} The EventSourcingDB client instance
 *
 * @throws {GenericException} If the client has not been initialized via setupEventSourcingDBClient
 *
 * @example
 * ```ts
 * import { getEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
 *
 * const client = getEventSourcingDBClient();
 * ```
 */
export const getEventSourcingDBClient = (): Client => {
    if (!eventSourcingDBClient) {
        throw new GenericException(
            'EventSourcingDB client not yet initialized. Please call setupEventSourcingDBClient() first.',
        );
    }

    return eventSourcingDBClient;
};
