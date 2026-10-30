import { Exception, getLogger } from '@nimbus-cqrs/core';
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
    writeEvents,
} from '@nimbus-cqrs/eventsourcingdb';
import { DbApiError, ErrorCode, isSubjectOnEventId } from 'eventsourcingdb';
import {
    type AcceptUserInvitationCommand,
    acceptUserInvitation,
} from '../../core/commands/acceptUserInvitation.command.ts';
import {
    applyEventToUserState,
    type UserState,
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

    for await (const eventSourcingDBEvent of readEvents(
        `/users/${command.data.id}`,
        {
            recursive: false,
        },
    )) {
        const event = eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent);

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
    // In this case we throw a proper exception and the
    // client need to handle it.
    //
    // writeEvents returns the written events including the
    // server-assigned ids. The id of the last written event is
    // the new revision of the user which we hand back to the client.

    let revision: string;

    try {
        const writtenEvents = await writeEvents(events, [
            isSubjectOnEventId(
                events[0].subject,
                command.data.expectedRevision,
            ),
        ]);

        revision = writtenEvents[writtenEvents.length - 1].id;
    } catch (error) {
        // EventSourcingDB reports a violated precondition as a
        // DbApiError with the preconditionViolated error code.
        const isStateConflict =
            error instanceof DbApiError &&
            error.code === ErrorCode.preconditionViolated;

        getLogger().error({
            category: 'AcceptUserInvitationCommandHandler',
            message: 'Error accepting user invitation',
            error: error as Error,
        });

        if (isStateConflict) {
            throw new Exception(
                'CONFLICT',
                'The expected revision does not match the current revision anymore',
                {
                    errorCode: 'REVISION_CONFLICT',
                    userId: state.id,
                    expectedRevision: command.data.expectedRevision,
                },
                409,
            );
        } else {
            throw error;
        }
    }

    return {
        userId: state.id,
        revision,
    };
};
