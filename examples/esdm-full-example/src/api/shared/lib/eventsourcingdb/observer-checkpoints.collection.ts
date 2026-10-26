import type { MongoCollectionDefinition } from '@nimbus-cqrs/mongodb';

/**
 * Stream positions for every event consumer, one document per consumer keyed
 * by its stable name. The position is the id of the last event the consumer
 * finished, advanced on every event whether or not the consumer handled it,
 * so it is a contiguous position rather than a high-water mark derived from
 * projected data.
 */
export const OBSERVER_CHECKPOINTS_COLLECTION: MongoCollectionDefinition = {
    name: 'observer_checkpoints',
    indexes: [{ key: { consumer: 1 }, unique: true }],
};
