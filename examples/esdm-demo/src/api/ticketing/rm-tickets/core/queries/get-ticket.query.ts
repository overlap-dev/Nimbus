import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';

// The "get ticket" query.
//
// Same trio as a command: a unique CloudEvents type, a schema that extends
// the Nimbus base query, and a handler. The handler lives in the shell,
// because reading MongoDB is I/O.
// shell/queries/get-ticket.handler.ts
//
// The handler does not enforce business rules. It reads the projection.
export const GET_TICKET_QUERY_TYPE = `${CLOUDEVENTS_NAMESPACE}.ticketing.tickets.get-ticket`;

export const getTicketInputSchema = z.object({
    ticketId: z.uuid(),
});

export const getTicketQuerySchema = querySchema.extend({
    type: z.literal(GET_TICKET_QUERY_TYPE),
    data: getTicketInputSchema,
    authcontext: authContextSchema,
});
export type GetTicketQuery = z.infer<typeof getTicketQuerySchema>;
