import { getLogger } from '@nimbus-cqrs/core';
import { UserInvitedEvent } from '../../../core/events/userInvited.event.ts';

export const userInvitedEventHandler = async (event: UserInvitedEvent) => {
    await Promise.resolve();

    getLogger().info({
        message: 'User invited',
        data: event.data ?? {},
    });
};
