import { Event } from '@nimbus/core';
import {
    USER_INVITED_EVENT_TYPE,
    UserInvitedEvent,
} from '../events/userInvited.event.ts';

export type UserState = {
    id: string;
    invitedAt?: string;
};

export const hasPendingInvitation = (state: UserState): boolean => {
    return state.invitedAt !== undefined;
};

export const applyEventToUserState = (
    state: UserState,
    event: Event,
): UserState => {
    switch (event.type) {
        case USER_INVITED_EVENT_TYPE: {
            return {
                ...state,

                // TODO: find a better way to cast the event to the correct type
                invitedAt: (event as any as UserInvitedEvent).data.invitedAt,
            };
        }
        default: {
            return state;
        }
    }
};
