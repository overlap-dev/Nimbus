import { Event } from '@nimbus-cqrs/core';
import { isUserInvitedEvent } from '../events/userInvited.event.ts';

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
    if (isUserInvitedEvent(event)) {
        return {
            ...state,
            invitedAt: event.data.invitedAt,
        };
    }

    return state;
};
