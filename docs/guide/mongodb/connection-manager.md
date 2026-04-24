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

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

```typescript
import { setupMongoConnectionManager } from "@nimbus-cqrs/mongodb";
import { getEnv } from "@nimbus-cqrs/utils";
import { ServerApiVersion } from "mongodb";

export const initMongoDB = () => {
    const env = getEnv({
        variables: ["MONGO_URL"],
    });

    setupMongoConnectionManager({
        name: "default",
        uri: env["MONGO_URL"],
        options: {
            appName: "nimbus-eventsourcing-demo",
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            },
        },
    });
};

const mongoManager = getMongoConnectionManager("default");
```

## Configuration

`setupMongoConnectionManager` takes a MongoDB connection URI and an optional
[`MongoClientOptions`](https://mongodb.github.io/node-mongodb-native/) object
that is forwarded as-is to the underlying `MongoClient`.

Optionally you can also specify a name for the connection manager. This is useful if you want to have multiple connections to different databases. If no name is specified, the connection manager will be named "default".

Refer to the [MongoDB driver options reference](https://mongodb.github.io/node-mongodb-native/) for more information on the available options.

Use `getMongoConnectionManager` to get the connection manager instance.

## Available Methods

| Method                              | Return Type                                           | Description                                                   |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
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
const client = await getMongoConnectionManager().getClient();

// Get a database
const db = await getMongoConnectionManager().getDatabase("myDatabase");

// Get a collection (most common)
const usersCollection = await getMongoConnectionManager().getCollection(
    "myDatabase",
    "users"
);
```

## Health Checks

Use `healthCheck()` to verify the database connection:

```typescript
app.get("/health", async (c) => {
    const dbHealth = await getMongoConnectionManager().healthCheck();

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
    await getMongoConnectionManager().close();
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
            () =>
                getMongoConnectionManager().getCollection(
                    "myDatabase",
                    "users"
                ),
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
    From `MongoConnectionManager.getInstance(uri, { mongoClientOptions: { ... } })` to `MongoConnectionManager.getInstance(uri, { ... })`.

    Use the new functions `setupMongoConnectionManager` and `getMongoConnectionManager` instead.

-   The `connectionTimeout` option has been removed. The driver handles socket lifecycle via `maxIdleTimeMS` on the pool.
-   The `cleanup()` method has been removed.  
    Delete any `setInterval(() => mongoManager.cleanup(), ...)` you set up.
-   The internal pre-flight `ping` on every `getClient()` call has been removed.
    If you relied on it for liveness, call `healthCheck()` explicitly (e.g. from a `/health` endpoint).
-   A new `close()` method is available for graceful shutdown.
