import { type Event, GenericException, getLogger } from '@nimbus/core';
import type {
    EventStore,
    EventStoreReadOptions,
    EventStoreWriteEvent,
} from '@nimbus/eventsourcing';

/**
 * Options for EventSourcingDBStore.
 */
export type EventSourcingDBStoreOptions = {
    apiUrl: string;
    secret: string;
};

const defaultReadOptions: EventStoreReadOptions = {
    recursive: false,
};

/**
 * EventSourcingDB adapter for the EventStore interface.
 *
 * Connects to EventSourcingDB API to write and read events.
 *
 * @example
 * ```ts
 * const eventStore = new EventSourcingDBStore({
 *     apiUrl: process.env.EVENTSOURCINGDB_API,
 *     secret: process.env.EVENTSOURCINGDB_SECRET,
 * });
 *
 * await eventStore.writeEvents([{
 *     source: 'my-app',
 *     subject: '/recipes/carbonara',
 *     type: 'recipe-added',
 *     data: { title: 'Carbonara' },
 * }]);
 *
 * const events = await eventStore.readEvents('/recipes/carbonara');
 * ```
 */
export class EventSourcingDBStore implements EventStore {
    private readonly _apiUrl: string;
    private readonly _secret: string;

    constructor(options: EventSourcingDBStoreOptions) {
        this._apiUrl = options.apiUrl;
        this._secret = options.secret;
    }

    /**
     * Write events to EventSourcingDB.
     *
     * @param events - Events to write
     * @returns The written events with metadata
     */
    async writeEvents(events: EventStoreWriteEvent[]): Promise<Event[]> {
        const payload = JSON.stringify({
            events: events,
        });

        const response = await fetch(`${this._apiUrl}/write-events`, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${this._secret}`,
                'content-type': 'application/json',
            },
            body: payload,
        });

        const body = await response.text();

        if (!response.ok) {
            throw new GenericException('Failed to write events', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                body,
            });
        }

        if (body.startsWith('[')) {
            let items: any[];

            try {
                items = JSON.parse(body);
            } catch (error: any) {
                throw new GenericException('Failed to parse events', {
                    reason: error.message,
                });
            }

            getLogger().debug({
                category: 'Nimbus',
                message: 'EventSourcingDBStore :: Events written',
                data: { count: items.length },
            });

            return items;
        } else {
            throw new GenericException('Failed to parse events', {
                reason: 'Response was not an array of events',
            });
        }
    }

    /**
     * Read events from EventSourcingDB.
     *
     * @param subject - The subject to read events for
     * @param options - Read options (recursive, order, bounds, etc.)
     * @returns Array of events matching the criteria
     */
    async readEvents(
        subject: string,
        options: EventStoreReadOptions = defaultReadOptions,
    ): Promise<Event[]> {
        const response = await fetch(`${this._apiUrl}/read-events`, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${this._secret}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                subject,
                options: {
                    recursive: options.recursive ?? false,
                    ...(options.order && { order: options.order }),
                    ...(options.lowerBound && {
                        lowerBound: options.lowerBound,
                    }),
                    ...(options.upperBound && {
                        upperBound: options.upperBound,
                    }),
                    ...(options.fromLatestEvent && {
                        fromLatestEvent: options.fromLatestEvent,
                    }),
                },
            }),
        });

        const body = await response.text();

        if (!response.ok) {
            throw new GenericException('Failed to read events', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                body,
            });
        }

        let items: any[] = [];

        try {
            // We return an empty array if there are no events at all.
            if (body.length === 0) {
                return [];
            }

            // Otherwise we turn the NDJSON response into an array of items.
            // https://docs.eventsourcingdb.io/getting-started/reading-events
            items = body
                .split('\n')
                .filter((item) => item.startsWith('{'))
                .map((item) => JSON.parse(item));
        } catch (error: any) {
            throw new GenericException('Failed to parse events', {
                reason: error.message,
            });
        }

        // Parse all items to Nimbus objects and ensure type safety.
        const events = items.map((item) => item.payload);

        getLogger().debug({
            category: 'Nimbus',
            message: 'EventSourcingDBStore :: Events read',
            data: { subject, count: events.length },
        });

        return events;
    }
}
