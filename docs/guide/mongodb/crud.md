---
prev:
    text: "Repository"
    link: "/guide/mongodb/repository"

next:
    text: "MongoJSON"
    link: "/guide/mongodb/mongo-json"
---

# CRUD+

The MongoDB package provides low-level CRUD functions for direct database operations. These functions are fully instrumented with OpenTelemetry tracing and metrics, and handle errors using Nimbus exceptions.

## When to Use

Use these low-level functions when:

-   You need operations not provided by `MongoDBRepository`
-   You want direct control over MongoDB operations
-   You're building custom repository methods

For standard CRUD operations, prefer using the [Repository](/guide/mongodb/repository) class.

## Available Functions

| Function            | Description                               |
| ------------------- | ----------------------------------------- |
| `find`              | Find multiple documents matching a filter |
| `findOne`           | Find a single document matching a filter  |
| `insertOne`         | Insert a single document                  |
| `insertMany`        | Insert multiple documents                 |
| `replaceOne`        | Replace a single document                 |
| `updateOne`         | Update a single document                  |
| `updateMany`        | Update multiple documents                 |
| `deleteOne`         | Delete a single document                  |
| `deleteMany`        | Delete multiple documents                 |
| `countDocuments`    | Count documents matching a filter         |
| `bulkWrite`         | Execute multiple write operations         |
| `aggregate`         | Execute an aggregation pipeline           |
| `findOneAndUpdate`  | Find and update a document atomically     |
| `findOneAndReplace` | Find and replace a document atomically    |
| `findOneAndDelete`  | Find and delete a document atomically     |

## Usage Examples

### Find Operations

Functions that return typed data require `mapDocument` and `outputType` parameters for type-safe results.

```typescript
import { find, findOne } from "@nimbus/mongodb";

type User = { _id: string; email: string; name: string };

// Find multiple documents
const users = await find<User>({
    collection,
    filter: { status: "active" },
    limit: 10,
    skip: 0,
    sort: { createdAt: -1 },
    mapDocument: (doc) => ({
        _id: doc._id.toString(),
        email: doc.email,
        name: doc.name,
    }),
    outputType: UserSchema,
});

// Find a single document
const user = await findOne<User>({
    collection,
    filter: { email: "john@example.com" },
    mapDocument: (doc) => ({
        _id: doc._id.toString(),
        email: doc.email,
        name: doc.name,
    }),
    outputType: UserSchema,
});
```

### Insert Operations

```typescript
import { insertOne, insertMany } from "@nimbus/mongodb";

// Insert a single document
const result = await insertOne({
    collection,
    document: {
        email: "john@example.com",
        name: "John Doe",
        createdAt: new Date(),
    },
});

// Insert multiple documents
const results = await insertMany({
    collection,
    documents: [
        { email: "john@example.com", name: "John" },
        { email: "jane@example.com", name: "Jane" },
    ],
});
```

### Update Operations

```typescript
import { updateOne, updateMany, replaceOne } from "@nimbus/mongodb";

// Update a single document
const result = await updateOne({
    collection,
    filter: { _id: userId },
    update: { $set: { name: "New Name", updatedAt: new Date() } },
});

// Update multiple documents
const results = await updateMany({
    collection,
    filter: { status: "pending" },
    update: { $set: { status: "processed" } },
});

// Replace a document entirely
const replaced = await replaceOne({
    collection,
    filter: { _id: userId },
    replacement: {
        email: "new@example.com",
        name: "New Name",
        updatedAt: new Date(),
    },
});
```

### Delete Operations

```typescript
import { deleteOne, deleteMany } from "@nimbus/mongodb";

// Delete a single document
const result = await deleteOne({
    collection,
    filter: { _id: userId },
});

// Delete multiple documents
const results = await deleteMany({
    collection,
    filter: { status: "deleted" },
});
```

### Atomic Find-and-Modify Operations

These functions return the document before or after modification, requiring `mapDocument` and `outputType` for type safety.

```typescript
import {
    findOneAndUpdate,
    findOneAndReplace,
    findOneAndDelete,
} from "@nimbus/mongodb";

type User = { _id: string; email: string; loginCount: number };

// Find and update atomically
const updated = await findOneAndUpdate<User>({
    collection,
    filter: { _id: userId },
    update: { $inc: { loginCount: 1 } },
    mapDocument: (doc) => ({
        _id: doc._id.toString(),
        email: doc.email,
        loginCount: doc.loginCount,
    }),
    outputType: UserSchema,
    options: { returnDocument: "after" },
});

// Find and replace atomically
const replaced = await findOneAndReplace<User>({
    collection,
    filter: { _id: userId },
    replacement: newDocument,
    mapDocument: (doc) => ({
        _id: doc._id.toString(),
        email: doc.email,
        loginCount: doc.loginCount,
    }),
    outputType: UserSchema,
    options: { returnDocument: "after" },
});

// Find and delete atomically
const deleted = await findOneAndDelete<User>({
    collection,
    filter: { _id: userId },
    mapDocument: (doc) => ({
        _id: doc._id.toString(),
        email: doc.email,
        loginCount: doc.loginCount,
    }),
    outputType: UserSchema,
});
```

### Aggregation

The `aggregate` function executes a pipeline and maps results to typed output.

```typescript
import { aggregate } from "@nimbus/mongodb";

type CategoryCount = { category: string; count: number };

const results = await aggregate<CategoryCount>({
    collection,
    aggregation: [
        { $match: { status: "active" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ],
    mapDocument: (doc) => ({
        category: doc._id,
        count: doc.count,
    }),
    outputType: CategoryCountSchema,
});
```

### Bulk Write

```typescript
import { bulkWrite } from "@nimbus/mongodb";

const result = await bulkWrite({
    collection,
    operations: [
        { insertOne: { document: { name: "New Item" } } },
        {
            updateOne: {
                filter: { _id: id1 },
                update: { $set: { status: "updated" } },
            },
        },
        { deleteOne: { filter: { _id: id2 } } },
    ],
});
```

### Count Documents

```typescript
import { countDocuments } from "@nimbus/mongodb";

const count = await countDocuments({
    collection,
    filter: { status: "active" },
});
```

## Observability

All CRUD functions are automatically instrumented with OpenTelemetry tracing and metrics.

### Tracing

Each operation creates a span with the following attributes:

| Attribute               | Description                              |
| ----------------------- | ---------------------------------------- |
| `db.system`             | Always `mongodb`                         |
| `db.operation`          | The operation name (e.g., `find`)        |
| `db.mongodb.collection` | The collection name                      |

### Metrics

Two metrics are recorded for every operation:

| Metric                              | Type      | Labels                           | Description                        |
| ----------------------------------- | --------- | -------------------------------- | ---------------------------------- |
| `mongodb_operation_total`           | Counter   | `operation`, `collection`, `status` | Total number of operations      |
| `mongodb_operation_duration_seconds`| Histogram | `operation`, `collection`        | Duration of operations in seconds  |

The `status` label is either `success` or `error`.

## Error Handling

All functions use `handleMongoError` internally to convert MongoDB errors to Nimbus exceptions. See [handleMongoError](/guide/mongodb/handle-mongo-error) for details on error mapping.
