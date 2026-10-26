import { MongoDBRepository, replaceOne } from '@nimbus-cqrs/mongodb';
import type { Document } from 'mongodb';
import { getMongoCollection } from '../../../../shared/lib/mongodb/getMongoCollection.ts';
import {
    type SettledArchiveState,
    settledArchiveInstanceSchema,
} from '../../core/domain/settled-archive.state.ts';
import { TICKETING_PM_SETTLED_ARCHIVE_COLLECTION } from './settled-archive.collection.ts';

class SettledArchiveRepository extends MongoDBRepository<SettledArchiveState> {
    constructor() {
        super(
            getMongoCollection(TICKETING_PM_SETTLED_ARCHIVE_COLLECTION),
            settledArchiveInstanceSchema,
            'Ticketing_Settled_Archive',
        );
    }

    override _mapDocumentToEntity(doc: Document): SettledArchiveState {
        return settledArchiveInstanceSchema.parse(doc);
    }

    override _mapEntityToDocument(item: SettledArchiveState): Document {
        return { ...item };
    }

    async getByTicketId(ticketId: string): Promise<SettledArchiveState | null> {
        const [document] = await this.find({
            filter: { ticketId },
            limit: 1,
        });

        return document ?? null;
    }

    async save(instance: SettledArchiveState): Promise<void> {
        const collection = await this._getCollection();

        await replaceOne({
            collection,
            filter: { ticketId: instance.ticketId },
            replacement: this._mapEntityToDocument(instance),
            options: { upsert: true },
        });
    }

    listDue(now: string): Promise<SettledArchiveState[]> {
        return this.find({
            filter: {
                archived: false,
                archiveDueAt: { $lte: now },
            },
        });
    }
}

export const settledArchiveRepository = new SettledArchiveRepository();
