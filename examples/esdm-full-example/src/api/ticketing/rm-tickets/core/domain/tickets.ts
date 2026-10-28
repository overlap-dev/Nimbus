import { z } from 'zod';
import { ticketStatusSchema } from '../../../agg-ticket/core/domain/status.value-object.ts';

// The document the tickets read model stores in MongoDB.
//
// One document per ticket, with the fields the queries need.
// It is derived from the event log. The log stays the source of truth,
// so this collection can be dropped and rebuilt by replaying.
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
