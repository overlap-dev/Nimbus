import type { AnyBulkWriteOperation, Document, Filter } from 'mongodb';
import { getMongoCollection } from '../mongodb/getMongoCollection.ts';
import { OBSERVER_CHECKPOINTS_COLLECTION } from './observer-checkpoints.collection.ts';
import {
    type ObserverCheckpointUpdate,
    observerCheckpointSchema,
} from './observer-group.ts';

class ObserverCheckpointsRepository {
    private getCollection() {
        return getMongoCollection(OBSERVER_CHECKPOINTS_COLLECTION)();
    }

    /**
     * Stored positions by consumer name. Consumers without a document are
     * absent from the result and start from the beginning of the stream.
     */
    public async getPositions(
        names: readonly string[],
    ): Promise<Map<string, string>> {
        const collection = await this.getCollection();

        const documents = await collection
            .find({ consumer: { $in: names } } as unknown as Filter<Document>)
            .toArray();

        const positions = new Map<string, string>();

        for (const document of documents) {
            const checkpoint = observerCheckpointSchema.parse({
                ...document,
                updatedAt:
                    document.updatedAt instanceof Date
                        ? document.updatedAt.toISOString()
                        : document.updatedAt,
                ...(document.degraded != null
                    ? {
                          degraded: {
                              ...document.degraded,
                              at:
                                  document.degraded.at instanceof Date
                                      ? document.degraded.at.toISOString()
                                      : document.degraded.at,
                          },
                      }
                    : {}),
            });

            if (checkpoint.eventId !== undefined) {
                positions.set(checkpoint.consumer, checkpoint.eventId);
            }
        }

        return positions;
    }

    /**
     * Persists every given position in a single round trip.
     */
    public async savePositions(
        updates: readonly ObserverCheckpointUpdate[],
    ): Promise<void> {
        if (updates.length === 0) {
            return;
        }

        const now = new Date();
        const collection = await this.getCollection();

        const operations: AnyBulkWriteOperation<Document>[] = updates.map(
            (update) => {
                return {
                    updateOne: {
                        filter: {
                            consumer: update.name,
                        } as unknown as Filter<Document>,
                        update: {
                            $set: {
                                observerGroup: update.observerGroup,
                                updatedAt: now,
                                ...(update.eventId !== undefined
                                    ? { eventId: update.eventId }
                                    : {}),
                                ...(update.degraded !== undefined
                                    ? {
                                          degraded: {
                                              ...update.degraded,
                                              at: now,
                                          },
                                      }
                                    : {}),
                            },
                            ...(update.degraded === undefined
                                ? { $unset: { degraded: '' } }
                                : {}),
                        },
                        upsert: true,
                    },
                };
            },
        );

        await collection.bulkWrite(operations, { ordered: false });
    }
}

export const observerCheckpointsRepository =
    new ObserverCheckpointsRepository();
