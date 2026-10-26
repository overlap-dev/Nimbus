import { z } from 'zod';
import { ticketStatusSchema } from '../../../agg-ticket/core/domain/status.value-object.ts';

/**
 * One Ticket as the read model holds it.
 */
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
