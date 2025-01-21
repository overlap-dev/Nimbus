import { RouteHandler } from '@nimbus/core';
import * as log from '@std/log';
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

    log.info({ msg: `New account was added: ${event.data.account.name}` });

    return {
        statusCode: 200,
        data: event.data,
    };
};
