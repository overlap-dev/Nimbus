---
prev:
    text: "Nimbus MongoDB"
    link: "/guide/mongodb"

next:
    text: "Repository"
    link: "/guide/mongodb/repository"
---

# Connection Manager

The `MongoConnectionManager` is a thin singleton wrapper around a single
long-lived `MongoClient`. The MongoDB Node driver already handles connection
pooling, server monitoring, automatic reconnection and per-socket idle
eviction, so the manager only adds the minimum on top: hold one client for
the lifetime of the application and provide typed `getDatabase` /
`getCollection` convenience methods.

## Basic Usage

```typescript
import { MongoConnectionManager } from "@nimbus-cqrs/mongodb";
import { ServerApiVersion } from "mongodb";

const mongoManager = MongoConnectionManager.getInstance(
    process.env.MONGO_URL ?? "",
    {
        appName: "my-app",
        serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
        },
    }
);

// Get a collection
const collection = await mongoManager.getCollection("myDatabase", "users");
```

## Configuration

`getInstance(uri, options?)` takes a MongoDB connection URI and an optional
[`MongoClientOptions`](https://mongodb.github.io/node-mongodb-native/) object
that is forwarded as-is to the underlying `MongoClient`.

We do not recommend specific timeout or pool values. Refer to the
[MongoDB driver options reference](https://mongodb.github.io/node-mongodb-native/)
and pick values that fit your workload. In particular, note that
`socketTimeoutMS` is a per-operation budget — if you set it, make sure it is
generous enough for your longest legitimate operation (e.g. large bulk
writes), or leave it unset to use the driver default.

## Available Methods

| Method                              | Return Type                                           | Description                                                   |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `getInstance(uri, options?)`        | `MongoConnectionManager`                              | Get the singleton instance                                    |
| `getClient()`                       | `Promise<MongoClient>`                                | Get the connected MongoDB client (lazy-connect on first call) |
| `getDatabase(dbName)`               | `Promise<Db>`                                         | Get a database instance                                       |
| `getCollection(dbName, collection)` | `Promise<Collection>`                                 | Get a collection instance                                     |
| `healthCheck()`                     | `Promise<{ status: 'healthy' \| 'error'; details? }>` | Ping the server to verify the connection                      |
| `close()`                           | `Promise<void>`                                       | Close the client and drain the pool (graceful shutdown)       |

## Connection Management

The manager creates a single `MongoClient` lazily on the first call to
`getClient()` (or any of the helpers built on top of it). Concurrent
first-callers share the same in-flight `connect()` promise, so only one
connection is established. Everything beyond the initial `connect()` —
pool growth/shrink, heartbeats, reconnects, retryable reads/writes — is
delegated to the driver.

### Getting Resources

```typescript
// Get a connected client
const client = await mongoManager.getClient();

// Get a database
const db = await mongoManager.getDatabase("myDatabase");

// Get a collection (most common)
const usersCollection = await mongoManager.getCollection("myDatabase", "users");
```

## Health Checks

Use `healthCheck()` to verify the database connection:

```typescript
app.get("/health", async (c) => {
    const dbHealth = await mongoManager.healthCheck();

    return c.json({
        status: dbHealth.status === "healthy" ? "ok" : "error",
        database: dbHealth,
    });
});
```

**Response format:**

```typescript
// Healthy
{ status: "healthy" }

// Error - `details` is the underlying error's `message`, or
// "Unknown error occurred" when no message is available.
{ status: "error", details: "<error.message>" }
```

## Graceful Shutdown

Call `close()` from your process shutdown handler so the driver can drain
the pool cleanly:

```typescript
import process from "node:process";

const shutdown = async () => {
    await mongoManager.close();
    process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

After `close()` resolves, the next call to `getClient()` will establish a
fresh connection.

## Using with Repository

The connection manager integrates seamlessly with the `MongoDBRepository` class:

```typescript
import { MongoDBRepository } from "@nimbus-cqrs/mongodb";
import { mongoManager } from "./mongodb.ts";
import { User, UserSchema } from "./user.ts";

class UserRepository extends MongoDBRepository<User> {
    constructor() {
        super(
            () => mongoManager.getCollection("myDatabase", "users"),
            UserSchema,
            "User"
        );
    }
}

export const userRepository = new UserRepository();
```

## Migration from 1.x

`@nimbus-cqrs/mongodb` 2.0 simplifies the connection manager. If you are
upgrading from 1.x:

-   The constructor signature is now flattened.  
    Replace `MongoConnectionManager.getInstance(uri, { mongoClientOptions: { ... } })` with `MongoConnectionManager.getInstance(uri, { ... })`.
-   The `connectionTimeout` option has been removed. The driver handles socket lifecycle via `maxIdleTimeMS` on the pool.
-   The `cleanup()` method has been removed.  
    Delete any `setInterval(() => mongoManager.cleanup(), ...)` you set up.
-   The internal pre-flight `ping` on every `getClient()` call has been removed.
    If you relied on it for liveness, call `healthCheck()` explicitly (e.g. from a `/health` endpoint).
-   A new `close()` method is available for graceful shutdown.
