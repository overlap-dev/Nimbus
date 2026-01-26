---
prev:
    text: "handleMongoError"
    link: "/guide/mongodb/handle-mongo-error"

next:
    text: "Nimbus Utils"
    link: "/guide/utils"
---

# Deploy Collection

The `deployMongoCollection` function creates or updates MongoDB collections with schema validation and indexes. It provides a declarative way to manage your database schema.

## Basic Usage

```typescript
import { deployMongoCollection } from "@nimbus/mongodb";
import { mongoManager } from "./mongodb.ts";

const USERS_COLLECTION = {
    name: "users",
    options: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["email", "firstName", "lastName"],
                properties: {
                    email: { bsonType: "string" },
                    firstName: { bsonType: "string" },
                    lastName: { bsonType: "string" },
                },
            },
        },
    },
    indexes: [
        { key: { email: 1 }, unique: true },
        { key: { lastName: 1, firstName: 1 } },
    ],
};

const client = await mongoManager.getClient();

await deployMongoCollection({
    mongoClient: client,
    dbName: "myDatabase",
    collectionDefinition: USERS_COLLECTION,
    allowUpdateIndexes: true,
});
```

## Function Parameters

| Parameter              | Type                        | Description                                       |
| ---------------------- | --------------------------- | ------------------------------------------------- |
| `mongoClient`          | `MongoClient`               | A connected MongoDB client instance               |
| `dbName`               | `string`                    | The name of the database                          |
| `collectionDefinition` | `MongoCollectionDefinition` | The collection definition object                  |
| `allowUpdateIndexes`   | `boolean`                   | Whether to update indexes on existing collections |

## Collection Definition

The `MongoCollectionDefinition` type defines the structure of a collection:

```typescript
type MongoCollectionDefinition = {
    name: string;
    options?: CreateCollectionOptions;
    indexes?: IndexDescription[];
};
```

| Property  | Type                      | Description                                   |
| --------- | ------------------------- | --------------------------------------------- |
| `name`    | `string`                  | The name of the collection                    |
| `options` | `CreateCollectionOptions` | MongoDB collection options (validation, etc.) |
| `indexes` | `IndexDescription[]`      | Array of index definitions                    |

## Behavior

The function handles two scenarios:

### New Collection

When the collection does not exist:

1. Creates the collection with the specified options
2. Creates all defined indexes

### Existing Collection

When the collection already exists:

1. Updates collection options using `collMod`
2. If `allowUpdateIndexes` is `true`:
    - Creates any new indexes not present in the database
    - Drops any indexes not defined in the collection definition (except `_id_`)

## Index Management

Indexes are automatically named based on their key fields if no name is provided:

```typescript
// This index will be named "email_1"
{ key: { email: 1 } }

// This index will be named "lastName_1_firstName_1"
{ key: { lastName: 1, firstName: 1 } }

// Explicit name
{ key: { email: 1 }, name: "email_unique_idx", unique: true }
```

## Deployment Script

Create a script to deploy all collections:

```typescript
import { deployMongoCollection } from "@nimbus/mongodb";
import { setupLogger, parseLogLevel } from "@nimbus/core";
import { mongoManager } from "./mongodb.ts";
import { USERS_COLLECTION } from "./collections/users.ts";
import { ORDERS_COLLECTION } from "./collections/orders.ts";

// Configure logging to see deployment progress
setupLogger({
    logLevel: parseLogLevel("info"),
});

const collections = [USERS_COLLECTION, ORDERS_COLLECTION];

const deployCollections = async () => {
    const client = await mongoManager.getClient();
    const dbName = process.env.MONGO_DB ?? "myDatabase";

    for (const collection of collections) {
        await deployMongoCollection({
            mongoClient: client,
            dbName,
            collectionDefinition: collection,
            allowUpdateIndexes: true,
        });
    }

    console.log("All collections deployed successfully");
};

deployCollections().catch(console.error);
```
