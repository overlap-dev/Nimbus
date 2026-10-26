import { MongoDBRepository } from '@nimbus-cqrs/mongodb';
import { z } from 'zod';
import { getMongoCollection } from '../../../../shared/lib/mongodb/getMongoCollection.ts';
import { TICKETING_NOTIFIED_ASSIGNMENTS_COLLECTION } from './notified-assignments.collection.ts';

const notifiedAssignmentSchema = z.object({
    _id: z.string(),
    eventId: z.string().min(1),
    notifiedAt: z.iso.datetime(),
});
type NotifiedAssignment = z.infer<typeof notifiedAssignmentSchema>;

/**
 * Idempotency store of the notify-assignee event handler.
 */
class NotifiedAssignmentsRepository extends MongoDBRepository<NotifiedAssignment> {
    constructor() {
        super(
            getMongoCollection(TICKETING_NOTIFIED_ASSIGNMENTS_COLLECTION),
            notifiedAssignmentSchema,
            'Ticketing_Notified_Assignment',
        );
    }

    async wasNotified(eventId: string): Promise<boolean> {
        const [document] = await this.find({
            filter: { eventId },
            limit: 1,
        });

        return document !== undefined;
    }

    async markNotified(eventId: string): Promise<void> {
        await this.insertOne({
            item: {
                _id: eventId,
                eventId,
                notifiedAt: new Date().toISOString(),
            },
        });
    }
}

export const notifiedAssignmentsRepository =
    new NotifiedAssignmentsRepository();
