import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

export const TICKETING_NOTIFIED_ASSIGNMENTS_COLLECTION: MongoCollectionDefinition =
    {
        name: 'ticketing_notified_assignments',
        indexes: [{ key: { eventId: 1 }, unique: true }],
    };
