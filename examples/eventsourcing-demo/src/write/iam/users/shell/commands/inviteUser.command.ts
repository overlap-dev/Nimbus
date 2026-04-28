import {
    getEventSourcingDBClient,
    writeEvents,
} from '@nimbus-cqrs/eventsourcingdb';
import { ulid } from '@std/ulid';
import { isSubjectPristine } from 'eventsourcingdb';
import {
    inviteUser,
    InviteUserCommand,
} from '../../core/commands/inviteUser.command.ts';
import { UserState } from '../../core/domain/user.state.ts';
import { USER_INVITED_EVENT_TYPE } from '../../core/events/userInvited.event.ts';

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

    // As the email address of a user should be unique and the
    // core inviteUser() function wants to know this information.
    // We have to check if the email address is not already used.
    // In this demo we simply count the number of
    // user invited events that have the same email address.
    //
    // Be aware that this might not be enough.
    // In case you can delete a user or and want to free the email
    // you would also need to include those events to
    // rebuild the state.

    let isEmailPristine: boolean = false;

    const eventSourcingDBClient = getEventSourcingDBClient();

    for await (
        const row of eventSourcingDBClient.runEventQlQuery(`
        FROM e IN events
	    WHERE e.type == "${USER_INVITED_EVENT_TYPE}" AND e.data.payload.email == "${command.data.email.toLowerCase()}"
		PROJECT INTO {
			total: COUNT()
		}
      `)
    ) {
        const total = (row as { total: number }).total;
        isEmailPristine = total === 0;
    }

    // We call the core logic with the initial state and the command data.
    const events = inviteUser(state, command, isEmailPristine);

    // We persist the events the core logic produced.
    await writeEvents(events, [
        isSubjectPristine(events[0].subject),
    ]);

    return {
        userId: state.id,
    };
};
