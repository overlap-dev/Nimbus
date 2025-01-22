# Commands

Commands are the messages that tell your application to do something.  
Like "Hey, create a new account with the following data".

::: info Example Application
You can find the full example on GitHub [The Expense Repo](https://github.com/overlap-dev/Nimbus/tree/main/examples/the-expense)

Check it out and run it with `deno task dev`
:::

## Example

At first we define the command and the core functionality in a file called `addAccount.ts` in the `core/commands` folder. If you like you can also split the command definition and the function into separate files. Or add more functions to handle the core business logic involved when adding an account.

Next we add a command handler in a fille called `addAccount.handler.ts` in the `shell/commands` folder. This is the first function that is executed when the app receives this specific command.

The command handler contains all the glue needed to communicate with other parts of the application and to handle all the side-effects. In this example we first call the core function to get a new account. Then we write the account to the database, we publish an event that the account was added and finally we return the account to the caller.

::: code-group

```typescript [Core]
import {
    AuthContext,
    Command,
    CommandMetadata,
    InvalidInputException,
} from "@nimbus/core";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { Account } from "../account.type.ts";

// Define the data for the command
export const AddAccountData = z.object({
    name: z.string(),
});
export type AddAccountData = z.infer<typeof AddAccountData>;

// Define the Command with it's unique name, data and metadata
export const AddAccountCommand = Command(
    z.literal("ADD_ACCOUNT"),
    AddAccountData,
    CommandMetadata(AuthContext) // You can define you own meta data type if needed
);
export type AddAccountCommand = z.infer<typeof AddAccountCommand>;

// The core logic
// We take the command data and the authContext and return the new account.
//
// Apply any important business logic here if needed.
// For example to set the balance of the account to 0
// or in case of a promotion add a starting balance.
export const addAccount = (
    data: AddAccountData,
    authContext?: AuthContext
): Account => {
    if (!authContext) {
        throw new InvalidInputException();
    }

    return {
        _id: new ObjectId().toString(),
        name: data.name,
        status: "active",
    };
};
```

```typescript [Shell]
import { InvalidInputException, type RouteHandler } from "@nimbus/core";
import { eventBus } from "../../../eventBus.ts";
import { Account } from "../../core/account.type.ts";
import {
    addAccount,
    AddAccountCommand,
} from "../../core/commands/addAccount.ts";
import { AccountAddedEvent } from "../../core/events/accountAdded.ts";
import { accountRepository } from "../account.repository.ts";

export const addAccountHandler: RouteHandler<any, Account> = async (
    command: AddAccountCommand
) => {
    // Call the Core with validated and type-safe inputs.
    // The Nimbus router takes care these are type checked and validated.
    // Learn more about the router on the next sections of the guide.
    let account = addAccount(command.data, command.metadata.authContext);

    // Write the new account to the database
    try {
        account = await accountRepository.insertOne({ item: account });
    } catch (error: any) {
        if (error.message.startsWith("E11000")) {
            throw new InvalidInputException("Account already exists", {
                errorCode: "ACCOUNT_ALREADY_EXISTS",
                reason: "An account with the same name already exists",
            });
        }

        throw error;
    }

    // We want to publish an event that the account was added
    // See more about events in the next section of the guide
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

    // Return the successful result
    return {
        statusCode: 200,
        data: account,
    };
};
```

:::

## Receive and Route Commands

Learn more about how to receive and route commands in the [Router](/guide/core/router.md) guide.
