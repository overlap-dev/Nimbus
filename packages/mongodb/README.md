<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus MongoDB

A small, opinionated layer on top of the official [`mongodb`](https://www.mongodb.com/docs/drivers/node/current/) Node driver. The package gives you:

-   a **singleton connection manager** with lazy connect, health check and graceful shutdown,
-   typed **CRUD helpers** that throw Nimbus exceptions and emit OpenTelemetry spans automatically,
-   a generic **`MongoDBRepository`** for typed entities with [Zod](https://zod.dev/) validation and pluggable document/entity mapping,
-   a **collection deployer** that creates / updates collections and synchronizes their indexes from a single declarative definition,
-   `MongoJSON` for round-tripping Mongo-typed values (`ObjectId`, `Date`, …) through plain JSON,
-   `handleMongoError` for translating MongoDB driver errors into Nimbus exceptions.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

## Install

```bash
# Deno
deno add jsr:@nimbus-cqrs/mongodb

# NPM
npm install @nimbus-cqrs/mongodb

# Bun
bun add @nimbus-cqrs/mongodb
```

`mongodb` is a peer dependency — install it (or use one of the runtimes that resolves it via `npm:`/`jsr:` specifiers).

# Examples

For detailed documentation, please refer to the [Nimbus documentation](https://nimbus.overlap.at).

The snippets below use a tiny `Todo` entity to walk through the package.

## MongoConnectionManager

`MongoConnectionManager` is a thin singleton around a single long-lived `MongoClient` that makes sure your app reuses one client, connects lazily on first use and shuts down cleanly.

```typescript
import { MongoConnectionManager } from "@nimbus-cqrs/mongodb";
import { ServerApiVersion } from "mongodb";

export const mongoManager = MongoConnectionManager.getInstance(
    process.env.MONGO_URI ?? "",
    {
        appName: "todo-app",
        serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
        },
    }
);

// Use it from anywhere in the app.
const todos = await mongoManager.getCollection("todo-app", "todos");

// Health endpoint.
const health = await mongoManager.healthCheck();
// { status: 'healthy' } | { status: 'error', details: '...' }

// Graceful shutdown.
process.on("SIGTERM", () => {
    mongoManager.close().catch(console.error);
});
```

`getInstance` is idempotent: subsequent calls return the existing instance and ignore the arguments. Concurrent first-callers share the same in-flight `connect()` promise so only one connection is ever established.

## CRUD helpers

Every common operation has a typed wrapper: `findOne`, `find`, `insertOne`, `insertMany`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany`, `findOneAndUpdate`, `findOneAndReplace`, `findOneAndDelete`, `aggregate`, `bulkWrite` and `countDocuments`. They all share the same idea: take a Zod schema for the result, run the operation against a `Collection`, validate the output, throw a Nimbus exception on failure, and produce an OpenTelemetry span for observability.

```typescript
import { findOne, insertOne } from "@nimbus-cqrs/mongodb";
import { z } from "zod";

const Todo = z.object({
    _id: z.string(),
    title: z.string().min(1),
    status: z.enum(["open", "done"]),
});
type Todo = z.infer<typeof Todo>;

const collection = await mongoManager.getCollection("todo-app", "todos");

await insertOne({
    collection,
    document: { _id: "todo-1", title: "Write the README", status: "open" },
});

const todo = await findOne<Todo>({
    collection,
    filter: { _id: "todo-1" },
    mapDocument: (doc) => ({
        _id: doc._id.toString(),
        title: doc.title,
        status: doc.status,
    }),
    outputType: Todo,
});
```

If the document doesn't exist, `findOne` throws a `NotFoundException` instead of returning `null`. If it exists but doesn't match the schema, it throws a `GenericException` carrying the original Zod error — so a malformed document at runtime is loud, not silent.

## MongoDBRepository

For most domains you don't want to call the CRUD helpers directly in every handler. `MongoDBRepository` wraps them in a typed, single-collection class with consistent error handling (entity-specific `NotFoundException` codes), centralized document↔entity mapping and a stable API.

```typescript
import { MongoDBRepository } from "@nimbus-cqrs/mongodb";
import type { Document } from "mongodb";
import { ObjectId } from "mongodb";
import { z } from "zod";

const Todo = z.object({
    _id: z.string(),
    title: z.string().min(1),
    status: z.enum(["open", "done"]),
});
type Todo = z.infer<typeof Todo>;

class TodoRepository extends MongoDBRepository<Todo> {
    constructor() {
        super(
            () => mongoManager.getCollection("todo-app", "todos"),
            Todo,
            "Todo"
        );
    }

    override _mapDocumentToEntity(doc: Document): Todo {
        return Todo.parse({
            _id: doc._id.toString(),
            title: doc.title,
            status: doc.status,
        });
    }

    override _mapEntityToDocument(todo: Todo): Document {
        return {
            _id: new ObjectId(todo._id),
            title: todo.title,
            status: todo.status,
        };
    }
}

export const todoRepository = new TodoRepository();

await todoRepository.insertOne({
    item: { _id: "507f1f77bcf86cd799439011", title: "Ship v2", status: "open" },
});

const todo = await todoRepository.findOne({
    filter: { _id: new ObjectId("507f1f77bcf86cd799439011") },
});
```

Misses, missed updates and missed deletes throw a `NotFoundException` with a domain-specific `errorCode` derived from the entity name (e.g. `TODO_NOT_FOUND`), which combines very nicely with [`@nimbus-cqrs/hono`](https://www.npmjs.com/package/@nimbus-cqrs/hono)'s `handleError` to produce consistent `404` responses.

## deployMongoCollection

`deployMongoCollection` reads a single `MongoCollectionDefinition` (name + driver options + indexes) and reconciles it against the database: it creates the collection if missing, applies `collMod` if it exists, and — when `allowUpdateIndexes` is enabled — adds new indexes and drops the ones no longer in the definition. Use it at startup or in a one-off migration script.

```typescript
import { deployMongoCollection } from "@nimbus-cqrs/mongodb";

const todoCollection = {
    name: "todos",
    options: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["_id", "title", "status"],
                properties: {
                    _id: { bsonType: "objectId" },
                    title: { bsonType: "string", minLength: 1 },
                    status: { enum: ["open", "done"] },
                },
            },
        },
    },
    indexes: [{ key: { status: 1 }, name: "status_1" }],
};

const client = await mongoManager.getClient();

await deployMongoCollection({
    mongoClient: client,
    dbName: "todo-app",
    collectionDefinition: todoCollection,
    allowUpdateIndexes: true,
});
```

## MongoJSON

`MongoJSON` is a `parse` / `stringify` pair that preserves Mongo-typed values across JSON boundaries by encoding them with short prefixes (`objectId::`, `date::`, `int::`, `double::`). Handy when filters arrive as query-string parameters or are stored in configuration that has to round-trip through plain JSON.

```typescript
import { MongoJSON } from "@nimbus-cqrs/mongodb";

const filter = MongoJSON.parse(`{
    "_id":       "objectId::507f1f77bcf86cd799439011",
    "createdAt": { "$gte": "date::2025-01-01T00:00:00Z" },
    "priority":  "int::1"
}`);

// filter._id        instanceof ObjectId
// filter.createdAt  contains a Date
// filter.priority   === 1 (number)
```

`parse` rejects strings containing blacklisted operators (default: `$where`) so untrusted input can't smuggle in JavaScript execution.

## handleMongoError

`handleMongoError` translates raw driver errors into Nimbus exceptions: schema-validation failures (`121`) and duplicate-key errors (`11000`) become `InvalidInputException` with the offending key/value attached, anything else falls back to `GenericException`. The CRUD helpers call it for you — reach for it directly only when you're using the raw driver inside a handler.

```typescript
import { handleMongoError } from "@nimbus-cqrs/mongodb";

try {
    await collection.insertOne({ _id: "duplicate", title: "oops" });
} catch (error) {
    throw handleMongoError(error);
    // -> InvalidInputException with { keyValue: { _id: 'duplicate' } }
}
```

# License

Copyright 2024-present Overlap GmbH & Co KG (https://overlap.at)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
