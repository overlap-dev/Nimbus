import { getQueryRouter } from '../../../query.router.ts';
import {
    GET_TICKET_QUERY_TYPE,
    getTicketQuerySchema,
} from '../core/queries/get-ticket.query.ts';
import {
    LIST_TICKETS_QUERY_TYPE,
    listTicketsQuerySchema,
} from '../core/queries/list-tickets.query.ts';
import { getTicketHandler } from './queries/get-ticket.handler.ts';
import { listTicketsHandler } from './queries/list-tickets.handler.ts';

// Register every query of the tickets read model.
//
// The type selects the handler. The schema validates the input
// before the handler runs.
export const registerTicketsQueries = (): void => {
    const router = getQueryRouter();

    router.register(
        LIST_TICKETS_QUERY_TYPE,
        listTicketsHandler,
        listTicketsQuerySchema,
    );

    router.register(
        GET_TICKET_QUERY_TYPE,
        getTicketHandler,
        getTicketQuerySchema,
    );
};
