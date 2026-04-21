import { createEvent, getEventBus, NotFoundException } from '@nimbus-cqrs/core';
import {
    inviteUser,
    InviteUserCommand,
} from '../../../core/commands/inviteUser.command.ts';
import { UserState } from '../../../core/domain/user.ts';
import {
    USER_INVITED_EVENT_TYPE,
    UserInvitedEvent,
} from '../../../core/events/userInvited.event.ts';
import { userRepository } from '../../mongodb/user.repository.ts';

export const inviteUserCommandHandler = async (
    command: InviteUserCommand,
) => {
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

    state = inviteUser(state, command);

    if (state !== null) {
        state = await userRepository.insertOne({
            item: state,
        });

        const event = createEvent<UserInvitedEvent>({
            type: USER_INVITED_EVENT_TYPE,
            source: 'nimbus.overlap.at',
            correlationid: command.correlationid,
            subject: `/users/${state._id}`,
            data: state,
        });

        eventBus.putEvent<UserInvitedEvent>(event);
    }

    return state;
};
