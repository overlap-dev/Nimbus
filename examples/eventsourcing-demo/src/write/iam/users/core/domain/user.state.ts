import { Event } from '@nimbus-cqrs/core';
import { isUserInvitationAcceptedEvent } from '../events/userInvitationAccepted.event.ts';
import { isUserInvitedEvent } from '../events/userInvited.event.ts';

// This is the definition of the state for the user entity.
// Basically this is simply an object with the properties
// necessary to represent a user.
//
// With the applyEventToUserState() function we can
// build a state object based on replayed events.
// It is a simple reducer function that applies an event
// to the current state.

export type UserState = {
    id: string;
    invitedAt?: string;
    acceptedAt?: string;
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

    if (isUserInvitationAcceptedEvent(event)) {
        return {
            ...state,
            acceptedAt: event.data.acceptedAt,
        };
    }

    return state;
};

// In addition this is a good place to define helper functions
// that are directly coupled to the state.

export const hasPendingInvitation = (state: UserState): boolean => {
    return state.invitedAt !== undefined && state.acceptedAt === undefined;
};
