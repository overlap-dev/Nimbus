import { writeEvents } from '@nimbus/eventsourcingdb';
import { ulid } from '@std/ulid';
import { isSubjectPristine } from 'eventsourcingdb';
import {
    inviteUser,
    InviteUserCommand,
} from '../../core/commands/inviteUser.command.ts';
import { UserState } from '../../core/domain/user.state.ts';

export const inviteUserCommandHandler = async (command: InviteUserCommand) => {
    const id = ulid();

    const state: UserState = { id };

    const events = inviteUser(state, command);

    await writeEvents(events, [
        isSubjectPristine(events[0].subject),
    ]);

    return {
        userId: id,
    };
};
