import { getLogger } from '@nimbus/core';
import { Event } from 'eventsourcingdb';
import { USER_INVITATION_ACCEPTED_EVENT_TYPE } from '../../write/iam/users/core/events/userInvitationAccepted.event.ts';
import { USER_INVITED_EVENT_TYPE } from '../../write/iam/users/core/events/userInvited.event.ts';
import {
    setUsersMemoryStoreLastEventId,
    usersMemoryStore,
    UsersRow,
} from '../shell/memoryStore/usersMemoryStore.ts';

export const projectViews = (event: Event) => {
    switch (event.type) {
        case USER_INVITED_EVENT_TYPE: {
            const usersRow: UsersRow = {
                id: event.data.id as string,
                revision: event.id as string,
                email: event.data.email as string,
                firstName: event.data.firstName as string,
                lastName: event.data.lastName as string,
                invitedAt: event.data.invitedAt as string,
                acceptedAt: null,
            };

            usersMemoryStore.set(
                event.data.id as string,
                usersRow,
            );

            setUsersMemoryStoreLastEventId(event.id);
            break;
        }
        case USER_INVITATION_ACCEPTED_EVENT_TYPE: {
            const id = event.subject.split('/')[2];
            const currentUsersRow = usersMemoryStore.get(id) as UsersRow;

            const usersRow: UsersRow = {
                ...currentUsersRow,
                revision: event.id as string,
                acceptedAt: event.data.acceptedAt as string,
            };

            usersMemoryStore.set(
                id,
                usersRow,
            );

            setUsersMemoryStoreLastEventId(event.id);
            break;
        }
        default: {
            getLogger().warn({
                category: 'ProjectViews',
                message: `Unknown event type ${event.type}`,
            });
            break;
        }
    }
};
