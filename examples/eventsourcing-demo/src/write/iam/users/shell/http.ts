import { createCommand, getRouter } from '@nimbus-cqrs/core';
import { getCorrelationId } from '@nimbus-cqrs/hono';
import { Hono } from 'hono';
import {
    ACCEPT_USER_INVITATION_COMMAND_TYPE,
    AcceptUserInvitationCommand,
} from '../core/commands/acceptUserInvitation.command.ts';
import {
    INVITE_USER_COMMAND_TYPE,
    InviteUserCommand,
} from '../core/commands/inviteUser.command.ts';

// This is the place where we connect the HTTP
// API and routing with the application logic.
//
// We define the HTTP route and in it's handler
// we build the typed command and use the Nimbus
// message router to to get the command validated
// and handled properly.
//
// In case you would also have other APIs like gRPC
// or websockets you could simply add them to the same
// Nimbus message router to make commands available
// through multiple channels.
//
// TODO: Maybe add an adapter function in the Hono package.

const httpUserCommandRouter = new Hono();

httpUserCommandRouter.post(
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

        const result = await getRouter('commandRouter').route(command);

        return c.json(result);
    },
);

httpUserCommandRouter.post(
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

        const result = await getRouter('commandRouter').route(command);

        return c.json(result);
    },
);

export default httpUserCommandRouter;
