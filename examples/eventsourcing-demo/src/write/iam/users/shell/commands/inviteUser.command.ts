import { ulid } from '@std/ulid';
import { type EventCandidate, isSubjectPristine } from 'eventsourcingdb';
import { getEventsourcingdbClient } from '../../../../../shared/shell/eventsourcingdb.ts';
import {
    inviteUser,
    InviteUserCommand,
} from '../../core/commands/inviteUser.command.ts';

export const inviteUserCommandHandler = async (command: InviteUserCommand) => {
    const id = ulid();

    const events = inviteUser(id, command);

    const eventCandidates: EventCandidate[] = events.map((event) => ({
        source: event.source,
        subject: event.subject,
        type: event.type,
        data: event.data,
    }));

    const esdbClient = getEventsourcingdbClient();

    await esdbClient.writeEvents(eventCandidates, [
        isSubjectPristine(eventCandidates[0].subject),
    ]);

    return {
        userId: id,
    };
};
