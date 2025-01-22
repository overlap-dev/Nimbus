# Router

The Nimbus router is responsible to take any input and route it to the correct handler. It is the entry point for all incoming messages.

## Example

In this example we create a router for the `addAccount` Command, the `getAccount` Query and the `accountAdded` Event from the previous examples.

```typescript
import { createRouter } from "@nimbus/core";

import { getAccountHandler } from "./queries/getAccount.handler.ts";
import { GetAccountQuery } from "../core/queries/getAccount.ts";

import { addAccountHandler } from "./commands/addAccount.handler.ts";
import { AddAccountCommand } from "../core/command/addAccount.ts";

import { accountAddedHandler } from "./events/accountAdded.handler.ts";
import { AccountAddedEvent } from "../core/events/accountAdded.ts";

const accountRouter = createRouter({
    handlerMap: {
        GET_ACCOUNT: {
            handler: getAccountHandler,
            inputType: GetAccountQuery,
        },
        ADD_ACCOUNT: {
            handler: addAccountHandler,
            inputType: AddAccountCommand,
        },
        ACCOUNT_ADDED: {
            handler: accountAddedHandler,
            inputType: AccountAddedEvent,
        },
    },
});

// Will result in a successful response
const result = await accountRouter({
    name: "GET_ACCOUNT",
    params: {
        id: "67580951d5260d05eaa7f913",
    },
    metadata: {
        correlationId: "123",
        authContext: {
            sub: "admin@host.tld",
        },
    },
});

// Will throw an InvalidInputException as the id parameter is missing
const result = await accountRouter({
    name: "UNKNOWN_QUERY",
    params: {},
    metadata: {
        correlationId: "123",
        authContext: {
            sub: "admin@host.tld",
        },
    },
});

// Will throw an NotFoundException as no route for UNKNOWN_QUERY is defined.
const result = await accountRouter({
    name: "UNKNOWN_QUERY",
    params: {},
    metadata: {
        correlationId: "123",
        authContext: {
            sub: "admin@host.tld",
        },
    },
});
```

## Type Safety

The router will validate the input against the input type defined in the handler map and will throw an `InvalidInputException` if the input is invalid. This ensures that the handler function will always receive the correct type checked input.
