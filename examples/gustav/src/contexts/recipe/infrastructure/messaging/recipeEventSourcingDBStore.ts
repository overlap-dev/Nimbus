import { GenericException } from '@nimbus/core';
import process from 'node:process';
import { RecipeEventStore } from '../../core/ports/recipeEventStore.ts';

const makeEventSourcingDBStore = (): RecipeEventStore => {
    return {
        writeEvents: async (events) => {
            const payload = JSON.stringify({
                events: events,
            });

            console.log('writeEvents', payload);

            const response = await fetch(
                `${process.env.EVENTSOURCINGDB_API}/write-events`,
                {
                    method: 'POST',
                    headers: {
                        'authorization':
                            `Bearer ${process.env.EVENTSOURCINGDB_SECRET}`,
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

            return body;
        },
    };
};

export const recipeEventSourcingDBStore = makeEventSourcingDBStore();
