import { getLogger } from '@nimbus/core';
import { Event } from 'eventsourcingdb';
import { USER_INVITED_EVENT_TYPE } from '../write/iam/users/core/events/userInvited.event.ts';
import {
    setUsersMemoryStoreLastEventId,
    usersMemoryStore,
    UsersRow,
} from './shell/memoryStore/usersMemoryStore.ts';

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
            };

            usersMemoryStore.set(
                event.data.id as string,
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
