import { createQuery, getRouter } from '@nimbus/core';
import { getCorrelationId } from '@nimbus/hono';
import { Hono } from 'hono';
import {
    GET_USER_QUERY_TYPE,
    GetUserQuery,
} from '../../core/queries/getUser.query.ts';
import {
    LIST_USERS_QUERY_TYPE,
    ListUsersQuery,
} from '../../core/queries/listUsers.query.ts';

const readRouter = new Hono();

readRouter.get(
    '/list-users',
    async (c) => {
        const correlationId = getCorrelationId(c);

        const query = createQuery<ListUsersQuery>({
            type: LIST_USERS_QUERY_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: correlationId,
            data: {},
        });

        const result = await getRouter('readRouter').route(query);

        return c.json(result);
    },
);

readRouter.get(
    '/:id',
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

        const result = await getRouter('readRouter').route(query);

        return c.json(result);
    },
);

export default readRouter;
