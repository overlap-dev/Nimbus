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
 * Best-effort record of mails notify-assignee has sent.
 *
 * A committed row skips a later delivery of the same event. A crash
 * after the mail is accepted and before this write does not, so
 * delivery stays at-least-once.
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
        const count = await this.countDocuments({
            filter: { eventId },
        });

        return count > 0;
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
