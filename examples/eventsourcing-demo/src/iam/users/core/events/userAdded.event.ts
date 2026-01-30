import { Event } from '@nimbus/core';
import { UserState } from '../domain/user.ts';

export const USER_ADDED_EVENT_TYPE = 'at.overlap.nimbus.user-added';

export type UserAddedEvent = Event<UserState> & {
    type: typeof USER_ADDED_EVENT_TYPE;
};
