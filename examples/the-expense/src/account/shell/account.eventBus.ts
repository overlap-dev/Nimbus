import { RouteHandlerMap } from '@nimbus/core';
import { AccountAddedEvent } from '../core/events/accountAdded.ts';
import { accountAddedHandler } from './events/accountAdded.handler.ts';

// TODO: rework eventBus to work more like the NimbusOakRouter

export const accountEventReceiver: RouteHandlerMap = {
    ACCOUNT_ADDED: {
        handler: accountAddedHandler,
        inputType: AccountAddedEvent,
    },
};
