import { createRouter, NimbusEventBus, RouteHandlerMap } from '@nimbus/core';
import * as log from '@std/log';
import { getLogger } from '@std/log/get-logger';
import { accountEventReceiver } from './account/shell/account.eventBus.ts';

export const eventBus = new NimbusEventBus({
    maxRetries: 0,
});

export const initEventBusReceivers = () => {
    const receivers: Record<string, RouteHandlerMap> = {
        account: accountEventReceiver,
    };

    for (const [key, handlerMap] of Object.entries(receivers)) {
        const eventRouter = createRouter({
            handlerMap,
            inputLogFunc: (input: any) => {
                getLogger('Nimbus').info({
                    msg: `:: ${input?.metadata?.correlationId} - [Event] ${input?.name} on ${key} domain`,
                });
            },
        });

        for (const eventName of Object.keys(handlerMap)) {
            log.info({ msg: `Subscribe event ${eventName} on ${key} domain` });

            eventBus.onEvent(eventName, async (event) => {
                await eventRouter(event);
            }).catch((error) => {
                log.error(error);
            });
        }
    }
};
