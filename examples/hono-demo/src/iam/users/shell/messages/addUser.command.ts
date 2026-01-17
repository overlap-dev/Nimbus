import {
    addUser,
    AddUserCommand,
} from '../../core/commands/addUser.command.ts';
import { UserState } from '../../core/domain/user.ts';
import { userRepository } from '../mongodb/user.repository.ts';

export const addUserCommandHandler = async (command: AddUserCommand) => {
    let state: UserState = null;

    try {
        state = await userRepository.findOne({
            filter: { email: command.data.email },
        });
    } catch (_error) {
        state = null;
    }

    state = addUser(state, command);

    if (state) {
        state = await userRepository.insertOne({
            item: state,
        });
    }

    return state;
};
