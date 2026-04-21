import { getEventBus, getRouter } from '@nimbus-cqrs/core';
import {
    INVITE_USER_COMMAND_TYPE,
    inviteUserCommandSchema,
} from '../../core/commands/inviteUser.command.ts';
import { USER_INVITED_EVENT_TYPE } from '../../core/events/userInvited.event.ts';
import {
    GET_USER_QUERY_TYPE,
    getUserQuerySchema,
} from '../../core/queries/getUser.query.ts';
import {
    GET_USER_GROUPS_QUERY_TYPE,
    getUserGroupsQuerySchema,
} from '../../core/queries/getUserGroups.ts';
import { inviteUserCommandHandler } from './commands/inviteUser.command.ts';
import { userInvitedEventHandler } from './events/userInvited.event.ts';
import { getUserQueryHandler } from './queries/getUser.query.ts';
import { getUserGroupsQueryHandler } from './queries/getUserGroups.query.ts';

export const registerUserMessages = () => {
    const eventBus = getEventBus('default');
    const router = getRouter('default');

    eventBus.subscribeEvent({
        type: USER_INVITED_EVENT_TYPE,
        handler: userInvitedEventHandler,
    });

    router.register(
        INVITE_USER_COMMAND_TYPE,
        inviteUserCommandHandler,
        inviteUserCommandSchema,
    );

    router.register(
        GET_USER_QUERY_TYPE,
        getUserQueryHandler,
        getUserQuerySchema,
    );
    router.register(
        GET_USER_GROUPS_QUERY_TYPE,
        getUserGroupsQueryHandler,
        getUserGroupsQuerySchema,
    );
};
