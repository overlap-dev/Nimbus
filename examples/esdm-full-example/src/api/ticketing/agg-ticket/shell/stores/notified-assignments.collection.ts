import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

/**
 * The ids of the assigned events notify-assignee has already emailed for.
 * One document per event id, so a redelivered event is recognised.
 */
export const TICKETING_NOTIFIED_ASSIGNMENTS_COLLECTION: MongoCollectionDefinition =
    {
        name: 'ticketing_notified_assignments',
        indexes: [{ key: { eventId: 1 }, unique: true }],
    };
