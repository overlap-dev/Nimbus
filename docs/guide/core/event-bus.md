# Event Bus

The Nimbus event bus allows to publish and subscribe to [events](/guide/core/events.md) within the application.

::: info Example Application
You can find the full example on GitHub [The Expense Repo](https://github.com/overlap-dev/Nimbus/tree/main/examples/the-expense)

Check it out and run it with `deno task dev`
:::

## Event Subscriptions

To set up event subscriptions, we want to create a new instance of the `NimbusEventBus` first. Then we want to use the `subscribeEvent` method to subscribe to all the events the application needs to handle.

In the `main.ts` file we call the `initEventBusSubscriptions` function to subscribe to all the events for the different domains when the application starts.

::: code-group

```typescript [eventBus.ts]
import { NimbusEventBus, RouteHandlerMap } from "@nimbus/core";
import { accountEventSubscriptions } from "./account/shell/account.eventBus.ts";

//
// Create a new instance of the event bus
//
export const eventBus = new NimbusEventBus({
    maxRetries: 3,
});

//
// Create a function that subscribes to all
// the events for the different domains
//
export const initEventBusSubscriptions = () => {
    const subscriptions: Record<string, RouteHandlerMap> = {
        account: accountEventSubscriptions,
    };

    for (const [, handlerMap] of Object.entries(subscriptions)) {
        for (const eventName of Object.keys(handlerMap)) {
            eventBus.subscribeEvent(
                eventName,
                handlerMap[eventName].inputType,
                handlerMap[eventName].handler
            );
        }
    }
};
```

```typescript [account.eventBus.ts]
import { RouteHandlerMap } from "@nimbus/core";
import { AccountAddedEvent } from "../core/events/accountAdded.ts";
import { accountAddedHandler } from "./events/accountAdded.handler.ts";

export const accountEventSubscriptions: RouteHandlerMap = {
    ACCOUNT_ADDED: {
        handler: accountAddedHandler,
        inputType: AccountAddedEvent,
    },
};
```

```typescript [main.ts]
import { initEventBusSubscriptions } from "./eventBus.ts";

initEventBusSubscriptions();
```

:::

## Publish Events

To publish an event, we can use the `putEvent` method of the `NimbusEventBus` class.

```typescript
import { eventBus } from "../../../eventBus.ts";
import { AccountAddedEvent } from "../../core/events/accountAdded.ts";

eventBus.putEvent<AccountAddedEvent>({
    name: "ACCOUNT_ADDED",
    data: {
        account: account,
    },
    metadata: {
        correlationId: command.metadata.correlationId,
        authContext: command.metadata.authContext,
    },
});
```
