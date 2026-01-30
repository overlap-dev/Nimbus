import { createCommand, getRouter } from '@nimbus/core';
import { getCorrelationId } from '@nimbus/hono';
import { Hono } from 'hono';
import {
    ACCEPT_USER_INVITATION_COMMAND_TYPE,
    AcceptUserInvitationCommand,
} from '../../core/commands/acceptUserInvitation.command.ts';
import {
    INVITE_USER_COMMAND_TYPE,
    InviteUserCommand,
} from '../../core/commands/inviteUser.command.ts';

const usersRouter = new Hono();

usersRouter.post(
    '/invite-user',
    async (c) => {
        const body = await c.req.json();
        const correlationId = getCorrelationId(c);

        const command = createCommand<InviteUserCommand>({
            type: INVITE_USER_COMMAND_TYPE,
            source: 'https://nimbus.overlap.at',
            correlationid: correlationId,
            data: body,
        });

        const result = await getRouter('writeRouter').route(command);

        return c.json(result);
    },
);

usersRouter.post(
    '/accept-user-invitation',
    async (c) => {
        const body = await c.req.json();
        const correlationId = getCorrelationId(c);

        const command = createCommand<AcceptUserInvitationCommand>({
            type: ACCEPT_USER_INVITATION_COMMAND_TYPE,
            source: 'https://nimbus.overlap.at',
            correlationid: correlationId,
            data: body,
        });

        const result = await getRouter('writeRouter').route(command);

        return c.json(result);
    },
);

export default usersRouter;
