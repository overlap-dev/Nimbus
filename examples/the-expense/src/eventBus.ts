import { NimbusEventBus, RouteHandlerMap } from '@nimbus/core';
import { accountEventSubscriptions } from './account/shell/account.eventBus.ts';

export const eventBus = new NimbusEventBus({
    maxRetries: 3,
});

export const initEventBusSubscriptions = () => {
    const subscriptions: Record<string, RouteHandlerMap> = {
        account: accountEventSubscriptions,
    };

    for (const [, handlerMap] of Object.entries(subscriptions)) {
        for (const eventName of Object.keys(handlerMap)) {
            eventBus.subscribeEvent(
                eventName,
                handlerMap[eventName].inputType,
                handlerMap[eventName].handler,
            );
        }
    }
};
