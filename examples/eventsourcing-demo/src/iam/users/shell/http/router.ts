import { createCommand, createQuery, getRouter } from '@nimbus/core';
import { getCorrelationId } from '@nimbus/hono';
import { Hono } from 'hono';
import {
    ADD_USER_COMMAND_TYPE,
    AddUserCommand,
} from '../../core/commands/addUser.command.ts';
import {
    GET_USER_QUERY_TYPE,
    GetUserQuery,
} from '../../core/queries/getUser.query.ts';
import {
    GET_USER_GROUPS_QUERY_TYPE,
    GetUserGroupsQuery,
} from '../../core/queries/getUserGroups.ts';

const usersRouter = new Hono();

usersRouter.post(
    '/add-user',
    async (c) => {
        const body = await c.req.json();
        const correlationId = getCorrelationId(c);

        const command = createCommand<AddUserCommand>({
            type: ADD_USER_COMMAND_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: correlationId,
            data: body,
        });

        const result = await getRouter('default').route(command);

        return c.json(result);
    },
);

usersRouter.get(
    '/groups',
    async (c) => {
        const correlationId = getCorrelationId(c);

        const query = createQuery<GetUserGroupsQuery>({
            type: GET_USER_GROUPS_QUERY_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: correlationId,
            data: {},
        });

        const result = await getRouter('default').route(query);

        return c.json(result);
    },
);

usersRouter.get(
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

        const result = await getRouter('default').route(query);

        return c.json(result);
    },
);

export default usersRouter;
