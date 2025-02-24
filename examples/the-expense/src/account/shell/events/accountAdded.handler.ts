import { getLogger, RouteHandler } from '@nimbus/core';
import {
    AccountAddedData,
    AccountAddedEvent,
} from '../../core/events/accountAdded.ts';

export const accountAddedHandler: RouteHandler<
    AccountAddedEvent,
    AccountAddedData
> = async (
    event,
) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    getLogger().info({
        message: `New account was added: ${event.data.account.name}`,
    });

    return {
        statusCode: 200,
        data: event.data,
    };
};
