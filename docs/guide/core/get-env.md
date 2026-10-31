---
description: getEnv loads environment variables, failing fast when a required one is missing and returning undefined for optional ones.

next:
    text: "Hono"
    link: "/guide/hono"
---

# getEnv

The `getEnv` function retrieves environment variables with validation. It throws an exception if any required variable is missing or empty, so your application fails fast with a clear error. Optional variables are returned as `undefined` instead.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

```typescript
import { getEnv } from "@nimbus-cqrs/core";

const env = getEnv({
    variables: ["DATABASE_URL", "API_KEY", "PORT"],
});

console.log(env.PORT);
```

## Function Signature

```typescript
type GetEnvResult<
    Required extends readonly string[],
    Optional extends readonly string[],
> = string extends Required[number]
    ? Record<string, string | undefined>
    : {
          [Key in Required[number]]: string;
      } & {
          [Key in Exclude<Optional[number], Required[number]>]:
              | string
              | undefined;
      };

getEnv({
    variables?: Required,
    optionalVariables?: Optional,
}): GetEnvResult<Required, Optional>
```

| Parameter             | Type       | Required | Description                                      |
| --------------------- | ---------- | -------- | ------------------------------------------------ |
| `variables`           | `string[]` | No       | Environment variable names that must be set      |
| `optionalVariables`   | `string[]` | No       | Environment variable names that may be omitted   |

Required names written as an array literal are typed as `string`. Optional names are typed as `string | undefined`. A name listed in both arrays is required. Only the names you pass exist on the result, so a typo is a type error.

Pass the names as array literals. If `variables` is a wide `string[]`, TypeScript can no longer tell those names apart, and every value is `string | undefined`.

`getEnv({})` returns `{}`.

## Optional Variables

```typescript
import { getEnv } from "@nimbus-cqrs/core";

const env = getEnv({
    variables: ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"],
    optionalVariables: ["SMTP_USER", "SMTP_PASSWORD"],
});

env.SMTP_HOST; // string
env.SMTP_USER; // string | undefined

const auth =
    env.SMTP_USER !== undefined && env.SMTP_PASSWORD !== undefined
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined;
```

A missing or empty optional variable is `undefined`. It is not logged and does not throw.

## Error Handling

If any required variable is missing or empty, `getEnv` throws a `GenericException` with details about all missing required variables:

```typescript
import { getEnv } from "@nimbus-cqrs/core";

try {
    const env = getEnv({
        variables: ["MISSING_VAR_1", "MISSING_VAR_2"],
    });
} catch (error) {
    // GenericException with:
    // - message: "Undefined environment variables"
    // - details: { undefinedVariables: ["MISSING_VAR_1", "MISSING_VAR_2"] }
}
```

The error is also logged before throwing:

```
[Nimbus] ERROR :: Undefined environment variables
{ undefinedVariables: ["MISSING_VAR_1", "MISSING_VAR_2"] }
```

## Use Cases

### Application Configuration

```typescript
import { getEnv } from "@nimbus-cqrs/core";

const env = getEnv({
    variables: ["NODE_ENV", "PORT", "DATABASE_URL", "REDIS_URL", "JWT_SECRET"],
});

export const config = {
    nodeEnv: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwtSecret: env.JWT_SECRET,
};
```

### MongoDB Connection

```typescript
import { getEnv } from "@nimbus-cqrs/core";
import { MongoConnectionManager } from "@nimbus-cqrs/mongodb";

const env = getEnv({
    variables: ["MONGO_URL", "MONGO_DB"],
});

const mongoManager = MongoConnectionManager.getInstance(env.MONGO_URL, {
    mongoClientOptions: { appName: "my-app" },
});

export const getCollection = (name: string) =>
    mongoManager.getCollection(env.MONGO_DB, name);
```

### Repository Configuration

```typescript
import { getEnv } from "@nimbus-cqrs/core";
import { MongoDBRepository } from "@nimbus-cqrs/mongodb";
import { mongoManager } from "./mongodb.ts";

class UserRepository extends MongoDBRepository<User> {
    constructor() {
        const env = getEnv({ variables: ["MONGO_DB"] });

        super(
            () => mongoManager.getCollection(env.MONGO_DB, "users"),
            UserSchema,
            "User",
        );
    }
}
```

### External Service Configuration

```typescript
import { getEnv } from "@nimbus-cqrs/core";

const env = getEnv({
    variables: ["STRIPE_API_KEY", "STRIPE_WEBHOOK_SECRET"],
});

export const stripeClient = new Stripe(env.STRIPE_API_KEY);
export const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
```
