import { type EventCandidate, isSubjectOnEventId } from 'eventsourcingdb';
import { getEventsourcingdbClient } from '../../../../../shared/shell/eventsourcingdb.ts';
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
    const esdbClient = getEventsourcingdbClient();

    let state: UserState = { id: command.data.id };

    for await (
        const event of esdbClient.readEvents(`/users/${command.data.id}`, {
            recursive: false,
        })
    ) {
        state = applyEventToUserState(state, event);
    }

    const events = acceptUserInvitation(state, command);

    const eventCandidates: EventCandidate[] = events.map((event) => ({
        source: event.source,
        subject: event.subject,
        type: event.type,
        data: event.data,
    }));

    await esdbClient.writeEvents(eventCandidates, [
        isSubjectOnEventId(
            eventCandidates[0].subject,
            command.data.expectedRevision,
        ),
    ]);

    return {};
};
