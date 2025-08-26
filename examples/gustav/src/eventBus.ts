import { NimbusEventBus, RouteHandlerMap } from '@nimbus/core';
import { recipeEventSubscriptions } from './contexts/recipe/infrastructure/messaging/recipeEventSubscriptions.ts';

export const eventBus = new NimbusEventBus({
    maxRetries: 3,
});

export const initEventBusSubscriptions = () => {
    const subscriptions: Record<string, RouteHandlerMap> = {
        recipe: recipeEventSubscriptions,
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
