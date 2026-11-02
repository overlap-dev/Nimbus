import {
    type Checkpoint,
    type CheckpointStore,
    type CheckpointUpdate,
    checkpointSchema,
} from '@nimbus-cqrs/core';
import type {
    AnyBulkWriteOperation,
    Collection,
    Document,
    Filter,
} from 'mongodb';
import type { MongoCollectionDefinition } from './deployCollection.ts';

/**
 * The collection {@link MongoCheckpointStore} persists checkpoints in.
 *
 * One document per consumer, keyed by its stable name. The unique index is
 * on the consumer name alone, so consumer names have to be unique across
 * the whole application, not just within one observer. Deploy it with
 * {@link deployMongoCollection} like any other collection.
 */
export const MONGO_CHECKPOINTS_COLLECTION: MongoCollectionDefinition = {
    name: 'nimbus_checkpoints',
    indexes: [{ key: { consumer: 1 }, unique: true }],
};

/**
 * Converts a value that is either a `Date` or already an ISO string.
 */
const toISOString = (value: unknown): unknown => {
    return value instanceof Date ? value.toISOString() : value;
};

/**
 * A {@link CheckpointStore} backed by a MongoDB collection.
 *
 * Positions are stored as strings and never interpreted, so the store
 * works for any event store integration. Dates are stored as BSON dates
 * and converted to ISO strings when read.
 *
 * @example
 * ```ts
 * import { getEnv } from '@nimbus-cqrs/core';
 * import {
 *     getMongoConnectionManager,
 *     MONGO_CHECKPOINTS_COLLECTION,
 *     MongoCheckpointStore,
 * } from '@nimbus-cqrs/mongodb';
 *
 * const env = getEnv({ variables: ['MONGO_DB'] });
 *
 * const getCheckpointCollection = () => {
 *     return getMongoConnectionManager().getCollection(
 *         env.MONGO_DB,
 *         MONGO_CHECKPOINTS_COLLECTION.name,
 *     );
 * };
 *
 * export const checkpointStore = new MongoCheckpointStore(getCheckpointCollection);
 * ```
 */
export class MongoCheckpointStore implements CheckpointStore {
    private readonly _getCollection: () => Promise<Collection<Document>>;

    /**
     * Create a new MongoCheckpointStore.
     *
     * @param getCollection - Resolves the collection to store checkpoints in.
     */
    constructor(getCollection: () => Promise<Collection<Document>>) {
        this._getCollection = getCollection;
    }

    /**
     * Loads the checkpoints of the given consumers, keyed by consumer name.
     * Consumers without a document are absent from the result.
     *
     * @param consumers - The names of the consumers to load.
     * @returns The stored checkpoints by consumer name.
     */
    public async load(
        consumers: readonly string[],
    ): Promise<Map<string, Checkpoint>> {
        const collection = await this._getCollection();

        const documents = await collection
            .find({
                consumer: { $in: [...consumers] },
            } as unknown as Filter<Document>)
            .toArray();

        const checkpoints = new Map<string, Checkpoint>();

        for (const document of documents) {
            const { _id, ...fields } = document;
            const checkpoint = checkpointSchema.parse({
                ...fields,
                updatedAt: toISOString(fields.updatedAt),
                ...(fields.failure != null
                    ? {
                          failure: {
                              ...fields.failure,
                              at: toISOString(fields.failure.at),
                          },
                      }
                    : {}),
            });

            checkpoints.set(checkpoint.consumer, checkpoint);
        }

        return checkpoints;
    }

    /**
     * Persists every given update in a single bulk write.
     *
     * @param updates - The checkpoints to persist.
     */
    public async save(updates: readonly CheckpointUpdate[]): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        const now = new Date();
        const collection = await this._getCollection();

        const operations: AnyBulkWriteOperation<Document>[] = updates.map(
            (update) => {
                return {
                    updateOne: {
                        filter: {
                            consumer: update.consumer,
                        } as unknown as Filter<Document>,
                        update: {
                            $set: {
                                observer: update.observer,
                                updatedAt: now,
                                ...(update.position !== undefined
                                    ? { position: update.position }
                                    : {}),
                                ...(update.failure !== undefined
                                    ? {
                                          failure: {
                                              ...update.failure,
                                              at: now,
                                          },
                                      }
                                    : {}),
                            },
                            ...(update.failure === undefined
                                ? { $unset: { failure: '' } }
                                : {}),
                        },
                        upsert: true,
                    },
                };
            },
        );

        await collection.bulkWrite(operations, { ordered: false });
    }

    /**
     * Moves a consumer to `position`, or back to the beginning when
     * `position` is omitted, and clears any failure marker. Nothing
     * happens for a consumer without a document.
     *
     * This is an offline operation: the observer running the consumer
     * must not be active while the checkpoint is reset.
     *
     * @param consumer - The name of the consumer to reset.
     * @param position - The position to resume after, or `undefined` to replay from the beginning.
     */
    public async reset(consumer: string, position?: string): Promise<void> {
        const collection = await this._getCollection();

        await collection.updateOne(
            { consumer } as unknown as Filter<Document>,
            {
                $set: {
                    updatedAt: new Date(),
                    ...(position !== undefined ? { position } : {}),
                },
                $unset: {
                    failure: '',
                    ...(position === undefined ? { position: '' } : {}),
                },
            },
        );
    }
}
