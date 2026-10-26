import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

export const TICKETING_RM_TICKETS_COLLECTION: MongoCollectionDefinition = {
    name: 'ticketing_rm_tickets',
    indexes: [
        { key: { ticketId: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { createdAt: -1, ticketId: 1 } },
    ],
};
