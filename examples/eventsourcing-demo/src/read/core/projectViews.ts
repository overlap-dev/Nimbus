import { getLogger } from '@nimbus/core';
import { eventSourcingDBEventToNimbusEvent } from '@nimbus/eventsourcingdb';
import { Event as EventSourcingDBEvent } from 'eventsourcingdb';
import {
    isUserInvitationAcceptedEvent,
    UserInvitationAcceptedEvent,
} from '../../write/iam/users/core/events/userInvitationAccepted.event.ts';
import {
    isUserInvitedEvent,
    UserInvitedEvent,
} from '../../write/iam/users/core/events/userInvited.event.ts';
import {
    setUsersMemoryStoreLastEventId,
    usersMemoryStore,
    UsersRow,
} from '../shell/memoryStore/usersMemoryStore.ts';

export const projectViews = (eventSourcingDBEvent: EventSourcingDBEvent) => {
    const event = eventSourcingDBEventToNimbusEvent<
        UserInvitedEvent | UserInvitationAcceptedEvent
    >(
        eventSourcingDBEvent,
    );

    if (isUserInvitedEvent(event)) {
        const usersRow: UsersRow = {
            id: event.data.id,
            revision: event.id,
            email: event.data.email,
            firstName: event.data.firstName,
            lastName: event.data.lastName,
            invitedAt: event.data.invitedAt,
            acceptedAt: null,
        };

        usersMemoryStore.set(
            event.data.id,
            usersRow,
        );

        setUsersMemoryStoreLastEventId(event.id);
        return;
    }

    if (isUserInvitationAcceptedEvent(event)) {
        const id = event.subject.split('/')[2];
        const currentUsersRow = usersMemoryStore.get(id);

        if (!currentUsersRow) {
            getLogger().warn({
                category: 'ProjectViews',
                message: `User not found in memory store: ${id}`,
            });
            return;
        }

        const usersRow: UsersRow = {
            ...currentUsersRow,
            revision: event.id,
            acceptedAt: event.data.acceptedAt,
        };

        usersMemoryStore.set(
            id,
            usersRow,
        );

        setUsersMemoryStoreLastEventId(event.id);
        return;
    }

    getLogger().warn({
        category: 'ProjectViews',
        message: `Unknown event type ${(event as { type: string }).type}`,
    });
};
