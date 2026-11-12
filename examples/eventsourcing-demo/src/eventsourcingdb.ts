import { getEnv } from '@nimbus-cqrs/core';
import { setupEventSourcingDBClient } from '@nimbus-cqrs/eventsourcingdb';
import {
    getMongoConnectionManager,
    MONGO_CHECKPOINTS_COLLECTION,
    MongoCheckpointStore,
} from '@nimbus-cqrs/mongodb';
import { contactsProjection } from './read/iam/users/projections/contacts.projection.ts';
import { usersProjection } from './read/iam/users/projections/users.projection.ts';

export const initEventSourcingDB = async () => {
    const env = getEnv({
        variables: ['ESDB_URL', 'ESDB_API_TOKEN', 'MONGO_DB'],
    });

    // Every consumer of an event observer owns a checkpoint.
    // The checkpoint is the id of the last event the consumer finished.
    //
    // We store the checkpoints in a MongoDB collection right next to
    // the projections. This way the consumers survive a restart of the
    // application and continue where they stopped.
    const checkpointStore = new MongoCheckpointStore(() => {
        return getMongoConnectionManager().getCollection(
            env.MONGO_DB,
            MONGO_CHECKPOINTS_COLLECTION.name,
        );
    });

    await setupEventSourcingDBClient({
        url: new URL(env.ESDB_URL),
        apiToken: env.ESDB_API_TOKEN,

        // We utilize EventSourcingDB to also be our "event bus".
        // We can register event observers to get all events
        // based on a defined subject.
        //
        // As soon the application starts the observer replays all events
        // for the defined subject its consumers have not seen yet. Then
        // it will pick up all new incoming events.
        //
        // In this case we add an event observer for the "users" subject.
        // It feeds two consumers which build the users and the contacts
        // projection.
        // read/iam/users/projections/users.projection.ts
        // read/iam/users/projections/contacts.projection.ts
        //
        // We will receive all events with the subject "/users"
        // and want this to be recursive so we get all events for all sub-subjects
        // e.g. "/users/123" as well.
        eventObservers: [
            {
                name: 'iam',
                subject: '/users',
                recursive: true,
                checkpointStore,
                consumers: [usersProjection, contactsProjection],
            },
        ],
    });
};
