import { Event } from 'eventsourcingdb';
import { USER_INVITED_EVENT_TYPE } from '../events/userInvited.event.ts';

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
                invitedAt: event.data.invitedAt as string,
            };
        }
        default: {
            return state;
        }
    }
};
