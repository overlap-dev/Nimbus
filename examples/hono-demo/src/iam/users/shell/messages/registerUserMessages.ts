import { getEventBus } from '@nimbus/core';
import { messageRouter } from '../../../../shared/shell/messageRouter.ts';
import {
    ADD_USER_COMMAND_TYPE,
    addUserCommandSchema,
} from '../../core/commands/addUser.command.ts';
import { USER_ADDED_EVENT_TYPE } from '../../core/events/userAdded.event.ts';
import {
    GET_USER_QUERY_TYPE,
    getUserQuerySchema,
} from '../../core/queries/getUser.query.ts';
import { addUserCommandHandler } from './commands/addUser.command.ts';
import { userAddedEventHandler } from './events/userAdded.event.ts';
import { getUserQueryHandler } from './queries/getUser.query.ts';

export const registerUserMessages = () => {
    const eventBus = getEventBus('default');

    eventBus.subscribeEvent({
        type: USER_ADDED_EVENT_TYPE,
        handler: userAddedEventHandler,
    });

    messageRouter.register(
        ADD_USER_COMMAND_TYPE,
        addUserCommandHandler,
        addUserCommandSchema,
    );

    messageRouter.register(
        GET_USER_QUERY_TYPE,
        getUserQueryHandler,
        getUserQuerySchema,
    );
};
