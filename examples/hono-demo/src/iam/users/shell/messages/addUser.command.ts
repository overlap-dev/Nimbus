import {
    addUser,
    AddUserCommand,
} from '../../core/commands/addUser.command.ts';
import { UserState } from '../../core/domain/user.ts';

export const addUserCommandHandler = async (command: AddUserCommand) => {
    let state: UserState = await Promise.resolve(null);

    state = addUser(state, command);

    return state;
};
