import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
    writeEvents,
} from '@nimbus/eventsourcingdb';
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

    const events = acceptUserInvitation(state, command);

    await writeEvents(events, [
        isSubjectOnEventId(
            events[0].subject,
            command.data.expectedRevision,
        ),
    ]);

    return {};
};
