import { MongoDBRepository, replaceOne } from '@nimbus-cqrs/mongodb';
import type { Document } from 'mongodb';
import { compactAnd } from '../../../../shared/lib/mongodb/compactAnd.ts';
import { getMongoCollection } from '../../../../shared/lib/mongodb/getMongoCollection.ts';
import { toIsoDatetime } from '../../../../shared/lib/toIsoDatetime.ts';
import {
    type TicketsDocument,
    ticketsDocumentSchema,
} from '../../core/domain/tickets.ts';
import {
    listTicketsMongoSort,
    type TicketsListFilters,
} from '../../core/domain/tickets.view.ts';
import { TICKETING_RM_TICKETS_COLLECTION } from './tickets.collection.ts';

class TicketingTicketsRepository extends MongoDBRepository<TicketsDocument> {
    constructor() {
        super(
            getMongoCollection(TICKETING_RM_TICKETS_COLLECTION),
            ticketsDocumentSchema,
            'Ticketing_Tickets',
        );
    }

    override _mapDocumentToEntity(doc: Document): TicketsDocument {
        return ticketsDocumentSchema.parse({
            ...doc,
            createdAt: toIsoDatetime(doc.createdAt),
            updatedAt: toIsoDatetime(doc.updatedAt),
        });
    }

    override _mapEntityToDocument(item: TicketsDocument): Document {
        return {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
        };
    }

    async getByTicketId(ticketId: string): Promise<TicketsDocument | null> {
        const [document] = await this.find({
            filter: { ticketId },
            limit: 1,
        });

        return document ?? null;
    }

    /** One page of not-archived Tickets, newest first. */
    async findPage(
        filters: TicketsListFilters,
        page: { offset: number; limit: number },
    ): Promise<{ documents: TicketsDocument[]; total: number }> {
        const filter = compactAnd([
            { archived: false },
            filters.status !== undefined
                ? { status: filters.status }
                : undefined,
        ]);
        const [documents, total] = await Promise.all([
            this.find({
                filter,
                skip: page.offset,
                limit: page.limit,
                sort: listTicketsMongoSort(),
            }),
            this.countDocuments({ filter }),
        ]);

        return { documents, total };
    }

    async saveProjection(document: TicketsDocument): Promise<void> {
        const collection = await this._getCollection();

        await replaceOne({
            collection,
            filter: { ticketId: document.ticketId },
            replacement: this._mapEntityToDocument(document),
            options: { upsert: true },
        });
    }
}

export const ticketingTicketsRepository = new TicketingTicketsRepository();
