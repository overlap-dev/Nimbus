import { getLogger } from '@nimbus/core';
import { UserAddedEvent } from '../../../core/events/userAdded.event.ts';

export const userAddedEventHandler = async (event: UserAddedEvent) => {
    await Promise.resolve();

    getLogger().info({
        message: 'User added',
        data: event.data ?? {},
    });
};
