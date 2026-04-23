import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
    writeEvents,
} from '@nimbus-cqrs/eventsourcingdb';
import { isSubjectOnEventId } from 'eventsourcingdb';
import {
    acceptUserInvitation,
    AcceptUserInvitationCommand,
} from '../../core/commands/acceptUserInvitation.command.ts';
import {
    applyEventToUserState,
    UserState,
} from '../../core/domain/user.state.ts';

export const acceptUserInvitationCommandHandler = async (
    command: AcceptUserInvitationCommand,
) => {
    // At first we get the current state.
    //
    // In this case we get the user's id from the command
    // and we replay all the events for this user based on its subject
    // to rebuild the current state.
    let state: UserState = { id: command.data.id };

    for await (
        const eventSourcingDBEvent of readEvents(
            `/users/${command.data.id}`,
            {
                recursive: false,
            },
        )
    ) {
        const event = eventSourcingDBEventToNimbusEvent(
            eventSourcingDBEvent,
        );

        state = applyEventToUserState(state, event);
    }

    // We call the core logic with the current state and the command data.
    const events = acceptUserInvitation(state, command);

    // We persist the events the core logic produced.
    //
    // IMPORTANT: We use the isSubjectOnEventId precondition
    // from EventSourcingDB to ensure consistency.
    // The client gives us the expected revision of the user.
    // The revision is simply the id of the last eventsourcingdb
    // event related to the user.
    // This way the EventSourcingDB can now check if for this
    // subject (the user) the expected revision is still the same.
    // If not, the write will fail as the user was modified
    // by another command in the meantime.
    //
    // TODO: Handle the error properly to inform the client about the conflict.
    // TODO: Can error handling be implemented in Nimbus to throw dedicated exceptions out of the box?
    await writeEvents(events, [
        isSubjectOnEventId(
            events[0].subject,
            command.data.expectedRevision,
        ),
    ]);

    return {
        userId: state.id,
    };
};
