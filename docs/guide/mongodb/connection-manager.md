---
prev:
    text: "Nimbus MongoDB"
    link: "/guide/mongodb"

next:
    text: "Repository"
    link: "/guide/mongodb/repository"
---

# Connection Manager

The `MongoConnectionManager` is a singleton class that manages MongoDB connections with automatic reconnection, health checks, and cleanup of inactive connections.

## Basic Usage

```typescript
import { MongoConnectionManager } from "@nimbus/mongodb";
import { ServerApiVersion } from "mongodb";

const mongoManager = MongoConnectionManager.getInstance(
    process.env.MONGO_URL ?? "",
    {
        mongoClientOptions: {
            appName: "my-app",
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            },
        },
    }
);

// Get a collection
const collection = await mongoManager.getCollection("myDatabase", "users");
```

## Configuration Options

| Option               | Type                 | Default      | Description                                        |
| -------------------- | -------------------- | ------------ | -------------------------------------------------- |
| `connectionTimeout`  | `number`             | `1800000`    | Inactivity timeout in ms before cleanup (30 min)   |
| `mongoClientOptions` | `MongoClientOptions` | _(required)_ | MongoDB driver client options                      |

### Recommended Configuration

```typescript
import { MongoConnectionManager } from "@nimbus/mongodb";
import { ServerApiVersion } from "mongodb";

const mongoManager = MongoConnectionManager.getInstance(
    process.env.MONGO_URL ?? "",
    {
        connectionTimeout: 1000 * 60 * 5, // 5 minutes
        mongoClientOptions: {
            appName: "my-app",
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            },
            maxPoolSize: 10,
            minPoolSize: 0,
            maxIdleTimeMS: 1000 * 60 * 1, // 1 minute idle timeout
            connectTimeoutMS: 1000 * 15, // 15 seconds connection timeout
            socketTimeoutMS: 1000 * 30, // 30 seconds socket timeout
        },
    }
);
```

## Available Methods

| Method                                | Return Type           | Description                                  |
| ------------------------------------- | --------------------- | -------------------------------------------- |
| `getInstance(uri, options)`           | `MongoConnectionManager` | Get the singleton instance                |
| `getClient()`                         | `Promise<MongoClient>`   | Get a connected MongoDB client            |
| `getDatabase(dbName)`                 | `Promise<Db>`            | Get a database instance                   |
| `getCollection(dbName, collection)`   | `Promise<Collection>`    | Get a collection instance                 |
| `healthCheck()`                       | `Promise<{ status, details? }>` | Check connection health          |
| `cleanup()`                           | `Promise<void>`          | Close inactive connections                |

## Connection Management

The manager automatically handles:

- **Connection pooling**: Reuses existing connections when available
- **Reconnection**: Automatically reconnects when the connection is lost
- **Connection testing**: Verifies connections with a ping before returning

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

// Error
{ status: "error", details: "Failed to ping MongoDB server" }
```

## Cleanup

The `cleanup()` method closes connections that have been inactive longer than the configured `connectionTimeout`. Set up an interval to call this periodically:

```typescript
import { getLogger } from "@nimbus/core";

// Check every minute for inactive connections
setInterval(() => {
    mongoManager.cleanup().catch((error) => {
        getLogger().error({
            message: "Failed to cleanup MongoDB connections",
            error,
        });
    });
}, 1000 * 60);
```

## Complete Setup Example

```typescript
import { getLogger } from "@nimbus/core";
import { MongoConnectionManager } from "@nimbus/mongodb";
import { ServerApiVersion } from "mongodb";

export const mongoManager = MongoConnectionManager.getInstance(
    process.env.MONGO_URL ?? "",
    {
        connectionTimeout: 1000 * 60 * 5,
        mongoClientOptions: {
            appName: "my-app",
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            },
            maxPoolSize: 10,
            minPoolSize: 0,
            maxIdleTimeMS: 1000 * 60 * 1,
            connectTimeoutMS: 1000 * 15,
            socketTimeoutMS: 1000 * 30,
        },
    }
);

export const initMongoConnectionManager = () => {
    // Periodic cleanup of inactive connections
    setInterval(() => {
        mongoManager.cleanup().catch((error) => {
            getLogger().error({
                message: error.message,
                error,
            });
        });
    }, 1000 * 60);
};
```

## Using with Repository

The connection manager integrates seamlessly with the `MongoDBRepository` class:

```typescript
import { MongoDBRepository } from "@nimbus/mongodb";
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
