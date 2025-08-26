import { CloudEvent, GenericException } from '@nimbus/core';
import { getEnv } from '@nimbus/utils';
import { z } from 'zod';
import { EventStore, EventStoreReadOptions } from '../ports/eventStore.ts';

// TODO: this implementation should be moved to @nimbus/eventsourcingdb

const defaultReadOptions: EventStoreReadOptions = {
    recursive: false,
};

const makeEventSourcingDBEventStore = (): EventStore => {
    const { EVENTSOURCINGDB_API, EVENTSOURCINGDB_SECRET } = getEnv({
        variables: ['EVENTSOURCINGDB_API', 'EVENTSOURCINGDB_SECRET'],
    });

    return {
        writeEvents: async (events) => {
            const payload = JSON.stringify({
                events: events,
            });

            const response = await fetch(
                `${EVENTSOURCINGDB_API}/write-events`,
                {
                    method: 'POST',
                    headers: {
                        'authorization': `Bearer ${EVENTSOURCINGDB_SECRET}`,
                        'content-type': 'application/json',
                    },
                    body: payload,
                },
            );

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

                const writtenEvents = items.map((item: any) =>
                    CloudEvent(z.string(), z.any()).parse(item)
                );

                return writtenEvents;
            } else {
                throw new GenericException('Failed to parse events', {
                    reason: 'Response was not an array of events',
                });
            }
        },

        readEvents: async (subject, options = defaultReadOptions) => {
            console.log('readEvents', subject, options);

            const response = await fetch(
                `${EVENTSOURCINGDB_API}/read-events`,
                {
                    method: 'POST',
                    headers: {
                        'authorization': `Bearer ${EVENTSOURCINGDB_SECRET}`,
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        subject,
                        options: {
                            recursive: options.recursive,
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
                },
            );

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
            const events = items.map((item) =>
                CloudEvent(z.string(), z.any()).parse(item.payload)
            );

            return events;
        },
    };
};

export const eventSourcingDBEventStore = makeEventSourcingDBEventStore();
