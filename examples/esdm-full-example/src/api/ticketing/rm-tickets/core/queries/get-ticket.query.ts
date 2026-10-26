import { querySchema } from '@nimbus-cqrs/core';
import { z } from 'zod';
import { authContextSchema } from '../../../../iam/dcb-auth/core/domain/auth-context.ts';
import { CLOUDEVENTS_NAMESPACE } from '../../../../shared/namespace.ts';

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
