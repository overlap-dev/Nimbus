import { createQuery, getRouter } from '@nimbus-cqrs/core';
import { getCorrelationId } from '@nimbus-cqrs/hono';
import { Hono } from 'hono';
import { GET_USER_QUERY_TYPE, GetUserQuery } from './queries/getUser.query.ts';
import {
    LIST_PENDING_USERS_EMAILS_QUERY_TYPE,
    ListPendingUsersEmailsQuery,
} from './queries/listPendingUsersEmails.ts';
import {
    LIST_USERS_QUERY_TYPE,
    ListUsersQuery,
} from './queries/listUsers.query.ts';

const httpUsersQueryRouter = new Hono();

httpUsersQueryRouter.get(
    '/list-users',
    async (c) => {
        const correlationId = getCorrelationId(c);

        const query = createQuery<ListUsersQuery>({
            type: LIST_USERS_QUERY_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: correlationId,
            data: {},
        });

        const result = await getRouter('queryRouter').route(query);

        return c.json(result);
    },
);

httpUsersQueryRouter.get(
    '/get-user-by-id/:id',
    async (c) => {
        const id = c.req.param('id');
        const correlationId = getCorrelationId(c);

        const query = createQuery<GetUserQuery>({
            type: GET_USER_QUERY_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: correlationId,
            data: {
                id: id,
            },
        });

        const result = await getRouter('queryRouter').route(query);

        return c.json(result);
    },
);

httpUsersQueryRouter.get(
    '/list-pending-users-emails',
    async (c) => {
        const correlationId = getCorrelationId(c);

        const query = createQuery<ListPendingUsersEmailsQuery>({
            type: LIST_PENDING_USERS_EMAILS_QUERY_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: correlationId,
            data: {},
        });

        const result = await getRouter('queryRouter').route(query);

        return c.json(result);
    },
);

export default httpUsersQueryRouter;
