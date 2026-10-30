import { z } from 'zod';
import { ticketStatusSchema } from '../../../agg-ticket/core/domain/status.value-object.ts';

// The document the tickets read model stores in MongoDB.
//
// One document per ticket, with the fields the queries need.
// It is derived from the event log. The log stays the source of truth.
// Dropping this collection does not rebuild it: the consumer checkpoint
// still sits at the end of the stream, so a restart skips the old
// events. Stop the process, drop the collection, delete that consumer's
// checkpoint, then start again so the projection replays from the start.
//
// There is no revision on the document. The projection's position in the
// log is the consumer checkpoint, not a field of the ticket.
export const ticketsDocumentSchema = z.object({
    _id: z.uuid(),
    ticketId: z.uuid(),
    title: z.string(),
    description: z.string().optional(),
    reporter: z.uuid(),
    assignee: z.uuid().optional(),
    status: ticketStatusSchema,
    archived: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});
export type TicketsDocument = z.infer<typeof ticketsDocumentSchema>;
