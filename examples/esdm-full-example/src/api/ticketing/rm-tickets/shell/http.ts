import type { Context } from 'hono';
import { Hono } from 'hono';
import { authentication } from '../../../iam/dcb-auth/shell/middleware/hono-auth.ts';
import { routeQuery } from '../../../shared/lib/routing.ts';
import type {
    ListTicketsResult,
    TicketDetailView,
} from '../core/domain/tickets.view.ts';
import {
    GET_TICKET_QUERY_TYPE,
    type GetTicketQuery,
} from '../core/queries/get-ticket.query.ts';
import {
    LIST_TICKETS_QUERY_TYPE,
    type ListTicketsQuery,
} from '../core/queries/list-tickets.query.ts';

// HTTP entry for the tickets queries.
//
// Each route builds a typed query through routeQuery(). The query router
// validates it against the schema and calls the shell handler.
// The auth context comes from the authentication middleware and is passed
// as an extension attribute, the same way commands carry it.
//
// list-tickets uses mapData because offset and limit arrive as strings.
// The query schema coerces them to numbers.
export const ticketsQueries = new Hono();

const mapListTicketsData = (c: Context): Record<string, unknown> => {
    const data: Record<string, unknown> = {};

    const status = c.req.query('status');
    if (status) {
        data.status = status;
    }

    const offset = c.req.query('offset');
    if (offset !== undefined) {
        data.offset = offset;
    }

    const limit = c.req.query('limit');
    if (limit !== undefined) {
        data.limit = limit;
    }

    return data;
};

ticketsQueries.get('/list-tickets', authentication(), (c) => {
    return routeQuery<ListTicketsQuery, ListTicketsResult>({
        c,
        type: LIST_TICKETS_QUERY_TYPE,
        mapData: mapListTicketsData,
    });
});

ticketsQueries.get('/get-ticket', authentication(), (c) => {
    return routeQuery<GetTicketQuery, TicketDetailView>({
        c,
        type: GET_TICKET_QUERY_TYPE,
    });
});
