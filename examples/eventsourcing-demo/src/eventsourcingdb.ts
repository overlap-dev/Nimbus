import { getLogger } from '@nimbus-cqrs/core';
import { setupEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
import { getEnv } from '@nimbus-cqrs/utils';
import { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import {
    getContactProjectionLowerBound,
    projectContacts,
} from './read/iam/users/projections/contacts.projection.ts';
import {
    getUserProjectionLowerBound,
    projectUsers,
} from './read/iam/users/projections/users.projection.ts';

export const initEventSourcingDB = async () => {
    const env = getEnv({
        variables: ['ESDB_URL', 'ESDB_API_TOKEN'],
    });

    await setupEventSourcingDBClient(
        {
            url: new URL(env.ESDB_URL),
            apiToken: env.ESDB_API_TOKEN,

            // We utilize EventSourcingDB to also be our "event bus".
            // We can register event observers to get all events
            // based on a defined subject.
            //
            // As soon the application starts all event in the EventSourcingDB
            // for the defined subject will be replayed first, then the observer
            // will pick up all new incoming events.
            //
            // In this case we add an event observer for the "users" subject.
            // This is used to build the users projection.
            // read/iam/users/projections/users.projection.ts
            //
            // We will receive all events with the subject "/users"
            // and want this to be recursive so we get all events for all sub-subjects
            // e.g. "/users/123" as well.
            eventObservers: [
                {
                    subject: '/users',
                    recursive: true,
                    eventHandler: projectUsers,
                    lowerBound: await getUserProjectionLowerBound() as any,
                },
                {
                    subject: '/users',
                    recursive: true,
                    eventHandler: projectContacts,
                    lowerBound: await getContactProjectionLowerBound() as any,
                },

                // This is an example to show how to handle errors
                // when handling observed events.
                //
                // The observer will retry it based on the handlerRetryOptions
                // after that it will call the onHandlerError function.
                // Based on the what on your use case you should decide
                // what should happen if the event could not be handled.
                {
                    subject: '/users',
                    recursive: true,
                    handlerRetryOptions: {
                        maxRetries: 2,
                        initialRetryDelayMs: 1000,
                    },
                    onHandlerError: (_error, event) => {
                        getLogger().info({
                            category: 'DLQ',
                            message: `DLQ received event: ${event.id}`,
                        });
                    },
                    eventHandler: async (
                        eventSourcingDBEvent: EventSourcingDBEvent,
                    ) => {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000)
                        );

                        getLogger().debug({
                            category: 'FaultyEventHandler',
                            message:
                                `Got event: "${eventSourcingDBEvent.id}" (${eventSourcingDBEvent.type}) for subject: "${eventSourcingDBEvent.subject}"`,
                        });

                        if (eventSourcingDBEvent.id === '1') {
                            getLogger().debug({
                                category: 'FaultyEventHandler',
                                message:
                                    `Will demo faulty behavior by throwing an error.`,
                            });

                            throw new Error(
                                'Faulty behavior demo: throwing an error',
                            );
                        }
                    },
                },
            ],
        },
    );
};
