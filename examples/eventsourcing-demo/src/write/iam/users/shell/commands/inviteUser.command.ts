import { writeEvents } from '@nimbus-cqrs/eventsourcingdb';
import { ulid } from '@std/ulid';
import { isSubjectPristine } from 'eventsourcingdb';
import {
    inviteUser,
    InviteUserCommand,
} from '../../core/commands/inviteUser.command.ts';
import { UserState } from '../../core/domain/user.state.ts';

// This is the handler for the user invite command.
// We place the handler in the shell as it coordinates all the side effectful operations.
//
// The general purpose of the handler is to:
// - Get the current state
// - Call the core logic with the current state and the command
// - Write the resulting events to the event store
// - Return some result to the caller
//
export const inviteUserCommandHandler = async (command: InviteUserCommand) => {
    // We get the current state
    // In this case we assume the the invitation is the beginning of the use case
    // and we provide a new initial state for a new user.
    const state: UserState = {
        id: ulid(),
    };

    // TODO: Add uniqueness check for the email address

    // We call the core logic with the initial state and the command data.
    const events = inviteUser(state, command);

    // We persist the events the core logic produced.
    await writeEvents(events, [
        isSubjectPristine(events[0].subject),
    ]);

    return {
        userId: state.id,
    };
};
