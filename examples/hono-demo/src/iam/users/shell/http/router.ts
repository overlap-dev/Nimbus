import { createCommand } from '@nimbus/core';
import { getCorrelationId } from '@nimbus/hono';
import { Hono } from 'hono';
import { messageRouter } from '../../../../shared/shell/messageRouter.ts';
import {
    ADD_USER_COMMAND_TYPE,
    AddUserCommand,
} from '../../core/commands/addUser.command.ts';

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

        const result = await messageRouter.route(command);

        return c.json(result);
    },
);

export default usersRouter;
