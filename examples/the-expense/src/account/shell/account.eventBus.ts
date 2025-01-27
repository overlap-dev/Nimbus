import { RouteHandlerMap } from '@nimbus/core';
import { AccountAddedEvent } from '../core/events/accountAdded.ts';
import { accountAddedHandler } from './events/accountAdded.handler.ts';

export const accountEventSubscriptions: RouteHandlerMap = {
    ACCOUNT_ADDED: {
        handler: accountAddedHandler,
        inputType: AccountAddedEvent,
    },
};
