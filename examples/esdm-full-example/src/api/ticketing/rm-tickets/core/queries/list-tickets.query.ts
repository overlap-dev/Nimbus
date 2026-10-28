import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';
import { ticketStatusSchema } from '../../../agg-ticket/core/domain/status.value-object.ts';

// list-tickets reads a page of the same projection as get-ticket.
//
// status, offset and limit narrow that page. Archived tickets are left
// out by the handler and the repository, not by this schema.
//
// One projection feeds both queries. A new question about tickets is
// another query on this collection, not another copy of the events.
export const LIST_TICKETS_QUERY_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.tickets.list-tickets`;

export const listTicketsInputSchema = z.object({
    status: ticketStatusSchema.optional(),
    offset: z.coerce.number().int().nonnegative().default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListTicketsInput = z.infer<typeof listTicketsInputSchema>;

export const listTicketsQuerySchema = querySchema.extend({
    type: z.literal(LIST_TICKETS_QUERY_TYPE),
    data: listTicketsInputSchema,
    authcontext: authContextSchema,
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
