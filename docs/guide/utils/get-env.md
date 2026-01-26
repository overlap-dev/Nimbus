---
prev:
    text: "Nimbus Utils"
    link: "/guide/utils"

next: false
---

# getEnv

The `getEnv` function retrieves environment variables with validation. It throws an exception if any requested variables are missing, ensuring your application fails fast with clear error messages.

## Basic Usage

```typescript
import { getEnv } from "@nimbus/utils";

const env = getEnv({
    variables: ["DATABASE_URL", "API_KEY", "PORT"],
});

console.log(env.PORT);
```

## Function Signature

```typescript
getEnv({ variables: string[] }): Record<string, string>
```

| Parameter   | Type       | Description                         |
| ----------- | ---------- | ----------------------------------- |
| `variables` | `string[]` | Array of environment variable names |

| Returns                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `Record<string, string>` | Object with variable names as keys and values |

## Error Handling

If any requested variables are undefined, `getEnv` throws a `GenericException` with details about all missing variables:

```typescript
import { getEnv } from "@nimbus/utils";

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
import { getEnv } from "@nimbus/utils";

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
import { MongoConnectionManager } from "@nimbus/mongodb";
import { getEnv } from "@nimbus/utils";

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
import { MongoDBRepository } from "@nimbus/mongodb";
import { getEnv } from "@nimbus/utils";
import { mongoManager } from "./mongodb.ts";

class UserRepository extends MongoDBRepository<User> {
    constructor() {
        const env = getEnv({ variables: ["MONGO_DB"] });

        super(
            () => mongoManager.getCollection(env.MONGO_DB, "users"),
            UserSchema,
            "User"
        );
    }
}
```

### External Service Configuration

```typescript
import { getEnv } from "@nimbus/utils";

const env = getEnv({
    variables: ["STRIPE_API_KEY", "STRIPE_WEBHOOK_SECRET"],
});

export const stripeClient = new Stripe(env.STRIPE_API_KEY);
export const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
```
