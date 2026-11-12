import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

// The MongoDB collection for the tickets read model.
//
// Each index serves a query:
// - ticketId, unique: get-ticket, and one document per ticket
// - status: list-tickets filtered by status
// - createdAt + ticketId: list-tickets, newest first, in a stable order
//
// There is no revision index. Resume position lives in
// observer_checkpoints, not in this collection.
export const TICKETING_RM_TICKETS_COLLECTION: MongoCollectionDefinition = {
    name: 'ticketing_rm_tickets',
    indexes: [
        { key: { ticketId: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { createdAt: -1, ticketId: 1 } },
    ],
};
