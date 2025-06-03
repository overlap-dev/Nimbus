import { RouteHandlerMap } from '@nimbus/core';
import { AccountAddedEvent } from '../core/events/accountAdded.ts';
import { accountAddedHandler } from './events/accountAdded.handler.ts';

export const accountEventSubscriptions: RouteHandlerMap = {
    'account.added': {
        handler: accountAddedHandler,
        inputType: AccountAddedEvent,
    },
};
