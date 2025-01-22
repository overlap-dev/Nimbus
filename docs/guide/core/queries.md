# Queries

Queries are the messages that tell your application to give you some information.  
Like "Hey give me the account with the ID 1234".

::: info Example Application
You can find the full example on GitHub [The Expense Repo](https://github.com/overlap-dev/Nimbus/tree/main/examples/the-expense)

Check it out and run it with `deno task dev`
:::

## Example

At first we define the query and the core functionality in a file called `getAccount.ts` in the `core/queries` folder. If you like you can also split the query definition and the function into separate files. Or add more functions to handle the core business logic involved when getting an account.

Next we add a query handler in a fille called `getAccount.handler.ts` in the `shell/queries` folder. This is the first function that is executed when the app receives this specific query.

The query handler contains all the glue needed to communicate with other parts of the application and to handle all the side-effects. In this example we first read the account from the database and then we call the core function to apply the business logic. Finally we return the account to the caller.

::: code-group

```typescript [Core]
import {
    AuthContext,
    InvalidInputException,
    Query,
    QueryMetadata,
} from "@nimbus/core";
import { z } from "zod";
import { Account } from "../account.type.ts";

// Define the Query with it's unique name, parameters and metadata
export const GetAccountQuery = Query(
    z.literal("GET_ACCOUNT"),
    z.object({
        id: z.string().length(24),
    }),
    QueryMetadata(AuthContext) // You can define you own meta data type if needed
);
export type GetAccountQuery = z.infer<typeof GetAccountQuery>;

export const getAccount = (
    data: Account,
    authContext?: AuthContext
): Account => {
    if (!authContext) {
        throw new InvalidInputException();
    }

    // Apply more business logic if necessary.
    // For example remove sensitive properties based on permission levels.

    return data;
};
```

```typescript [Shell]
import { RouteHandler } from "@nimbus/core";
import { ObjectId } from "mongodb";
import { Account } from "../../core/account.type.ts";
import { getAccount, GetAccountQuery } from "../../core/queries/getAccount.ts";
import { accountRepository } from "../account.repository.ts";

export const getAccountHandler: RouteHandler<GetAccountQuery, Account> = async (
    query
) => {
    // Read the account from the database
    let account = await accountRepository.findOne({
        filter: { _id: new ObjectId(query.params.id) },
    });

    // Call the core function
    account = getAccount(account, query.metadata.authContext);

    // Return the successful result
    return {
        statusCode: 200,
        data: account,
    };
};
```

:::

## Receive and Route Queries

Learn more about how to receive and route queries in the [Query Bus](/guide/core/query-bus.md) guide.
