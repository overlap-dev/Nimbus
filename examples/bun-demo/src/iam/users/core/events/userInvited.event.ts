import { Event } from '@nimbus-cqrs/core';
import { UserState } from '../domain/user.ts';

export const USER_INVITED_EVENT_TYPE = 'at.overlap.nimbus.user-invited';

export type UserInvitedEvent = Event<UserState> & {
    type: typeof USER_INVITED_EVENT_TYPE;
};
