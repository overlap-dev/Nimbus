import { createEvent, getEventBus, NotFoundException } from '@nimbus/core';
import {
    addUser,
    AddUserCommand,
} from '../../../core/commands/addUser.command.ts';
import { UserState } from '../../../core/domain/user.ts';
import {
    USER_ADDED_EVENT_TYPE,
    UserAddedEvent,
} from '../../../core/events/userAdded.event.ts';
import { userRepository } from '../../mongodb/user.repository.ts';

export const addUserCommandHandler = async (command: AddUserCommand) => {
    const eventBus = getEventBus('default');
    let state: UserState = null;

    try {
        state = await userRepository.findOne({
            filter: { email: command.data.email },
        });
    } catch (_error) {
        if (_error instanceof NotFoundException) {
            state = null;
        } else {
            throw _error;
        }
    }

    state = addUser(state, command);

    if (state !== null) {
        state = await userRepository.insertOne({
            item: state,
        });

        const event = createEvent<UserAddedEvent>({
            type: USER_ADDED_EVENT_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: command.correlationid,
            subject: `/users/${state._id}`,
            data: state,
        });

        eventBus.putEvent<UserAddedEvent>(event);
    }

    return state;
};
