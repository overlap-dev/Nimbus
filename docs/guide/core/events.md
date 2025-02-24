# Events

Events are the messages that tell your application something has happened.  
Like "Hey, the account with the ID 1234 has been updated".

::: info Example Application
You can find the full example on GitHub [The Expense Repo](https://github.com/overlap-dev/Nimbus/tree/main/examples/the-expense)

Check it out and run it with `deno task dev`
:::

## Example

At first we define the event in a file called `accountAdded.ts` in the `core/events` folder.

Next we create an event handler function in a fille called `accountAdded.handler.ts` in the `shell/events` folder. This is the first function that is executed when the app receives this specific event.

The event handler contains all the glue needed to communicate with other parts of the application and to handle all the side-effects. In this example we simply wait a second and log an info to the console.

::: code-group

```typescript [Core]
import { AuthContext, Event, EventMetadata } from "@nimbus/core";
import { z } from "zod";
import { Account } from "../account.type.ts";

// Define the data for the event
export const AccountAddedData = z.object({
    account: Account,
});
export type AccountAddedData = z.infer<typeof AccountAddedData>;

// Define the Event with it's unique name, data and metadata
export const AccountAddedEvent = Event(
    z.literal("ACCOUNT_ADDED"),
    AccountAddedData,
    EventMetadata(AuthContext) // You can define you own meta data type if needed
);
export type AccountAddedEvent = z.infer<typeof AccountAddedEvent>;
```

```typescript [Shell]
import { getLogger, RouteHandler } from "@nimbus/core";
import {
    AccountAddedData,
    AccountAddedEvent,
} from "../../core/events/accountAdded.ts";

export const accountAddedHandler: RouteHandler<
    AccountAddedEvent,
    AccountAddedData
> = async (event) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    getLogger().info({
        message: `New account was added: ${event.data.account.name}`,
    });

    // This is just an example.
    // Change the code to do what has to be done after an account got added.
    // For example send a mail to the owner.

    return {
        statusCode: 200,
        data: event.data,
    };
};
```

:::

## Publish and Subscribe to Events

Learn more about how to publish and subscribe to events in the [Event Bus](/guide/core/event-bus.md) guide.
