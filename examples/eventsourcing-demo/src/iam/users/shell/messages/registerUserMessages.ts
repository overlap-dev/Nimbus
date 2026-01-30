import { getEventBus, getRouter } from '@nimbus/core';
import {
    ADD_USER_COMMAND_TYPE,
    addUserCommandSchema,
} from '../../core/commands/addUser.command.ts';
import { USER_ADDED_EVENT_TYPE } from '../../core/events/userAdded.event.ts';
import {
    GET_USER_QUERY_TYPE,
    getUserQuerySchema,
} from '../../core/queries/getUser.query.ts';
import {
    GET_USER_GROUPS_QUERY_TYPE,
    getUserGroupsQuerySchema,
} from '../../core/queries/getUserGroups.ts';
import { addUserCommandHandler } from './commands/addUser.command.ts';
import { userAddedEventHandler } from './events/userAdded.event.ts';
import { getUserQueryHandler } from './queries/getUser.query.ts';
import { getUserGroupsQueryHandler } from './queries/getUserGroups.query.ts';

export const registerUserMessages = () => {
    const eventBus = getEventBus('default');
    const router = getRouter('default');

    eventBus.subscribeEvent({
        type: USER_ADDED_EVENT_TYPE,
        handler: userAddedEventHandler,
    });

    router.register(
        ADD_USER_COMMAND_TYPE,
        addUserCommandHandler,
        addUserCommandSchema,
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
