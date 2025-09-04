<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus Core

The core package of the Nimbus framework.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

# Examples

These are some quick examples on how the basics of the Nimbus framework work.

For detailed documentation, please refer to the [Nimbus documentation](https://nimbus.overlap.at).

## Command

```typescript
import { AuthContext, Command } from "@nimbus/core";
import { z } from "zod";

export const AddAccountData = z.object({
    name: z.string(),
});
export type AddAccountData = z.infer<typeof AddAccountData>;

export const AddAccountCommand = Command(
    z.literal("account.add"),
    AddAccountData,
    AuthContext
);
export type AddAccountCommand = z.infer<typeof AddAccountCommand>;
```

## Query

```typescript
import { AuthContext, Query } from "@nimbus/core";
import { z } from "zod";

export const GetAccountQuery = Query(
    z.literal("account.get"),
    z.object({
        id: z.string().length(24),
    }),
    AuthContext
);
export type GetAccountQuery = z.infer<typeof GetAccountQuery>;
```

## Event

```typescript
import { Event } from "@nimbus/core";
import { z } from "zod";
import { Account } from "../account.type.ts";

export const AccountAddedData = z.object({
    account: Account,
});
export type AccountAddedData = z.infer<typeof AccountAddedData>;

export const AccountAddedEvent = Event(
    z.literal("account.added"),
    AccountAddedData
);
export type AccountAddedEvent = z.infer<typeof AccountAddedEvent>;
```

## Router

```typescript
import { createRouter } from "@nimbus/core";

// ...

const accountRouter = createRouter({
    handlerMap: {
        "account.get": {
            handler: getAccountHandler,
            inputType: GetAccountQuery,
        },
        "account.add": {
            handler: addAccountHandler,
            inputType: AddAccountCommand,
        },
    },
});
```

## EventBus

```typescript
import { NimbusEventBus } from "@nimbus/core";

// ...

export const eventBus = new NimbusEventBus({
    maxRetries: 3,
    retryDelay: 3000,
});

eventBus.subscribeEvent(
    "account.added",
    AccountAddedEvent,
    accountAddedHandler
);

eventBus.putEvent<AccountAddedEvent>({
    specversion: "1.0",
    id: "123",
    source: command.source,
    type: "account.added",
    data: {
        correlationId: command.metadata.correlationId,
        payload: { account: account },
    },
});
```

# License

The MIT License (MIT)
