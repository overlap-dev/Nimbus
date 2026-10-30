import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

// TODO: integrate into the framework?

// Where each event consumer resumes after a restart.
//
// One document per consumer, keyed by its stable name. The position is the
// id of the last event that consumer finished. It moves forward on every
// event of the subject, including events the consumer does not handle, so
// the position stays contiguous.
//
// That is separate from the data the consumer writes. A ticket document
// describes the ticket. This collection describes the consumer. Rebuilding
// a projection does not require a revision field on every document, and
// several consumers of the same subject can each remember their own place.
export const OBSERVER_CHECKPOINTS_COLLECTION: MongoCollectionDefinition = {
    name: 'observer_checkpoints',
    indexes: [{ key: { consumer: 1 }, unique: true }],
};
