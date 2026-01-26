---
prev:
    text: "Connection Manager"
    link: "/guide/mongodb/connection-manager"

next:
    text: "CRUD+"
    link: "/guide/mongodb/crud"
---

# Repository

The `MongoDBRepository` is a type-safe base class for MongoDB CRUD operations. It provides a consistent interface for interacting with MongoDB collections while handling validation, error conversion, and document mapping.

## Basic Usage

Create a repository by extending `MongoDBRepository`:

```typescript
import { MongoDBRepository } from "@nimbus/mongodb";
import { z } from "zod";
import { mongoManager } from "./mongodb.ts";

// Define your entity schema
const User = z.object({
    _id: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

type User = z.infer<typeof User>;

// Create the repository
class UserRepository extends MongoDBRepository<User> {
    constructor() {
        super(
            () => mongoManager.getCollection("myDatabase", "users"),
            User,
            "User"
        );
    }
}

export const userRepository = new UserRepository();
```

## Constructor Parameters

| Parameter       | Type                        | Description                                       |
| --------------- | --------------------------- | ------------------------------------------------- |
| `getCollection` | `() => Promise<Collection>` | Function that returns a MongoDB collection        |
| `entityType`    | `ZodType`                   | Zod schema for validating and typing entities     |
| `entityName`    | `string` (optional)         | Name used in error messages (default: "Document") |

## Available Methods

| Method           | Parameters                                             | Return Type       | Description                 |
| ---------------- | ------------------------------------------------------ | ----------------- | --------------------------- |
| `findOne`        | `{ filter }`                                           | `Promise<T>`      | Find a single document      |
| `find`           | `{ filter, limit?, skip?, sort?, project?, options? }` | `Promise<T[]>`    | Find multiple documents     |
| `countDocuments` | `{ filter, options? }`                                 | `Promise<number>` | Count matching documents    |
| `insertOne`      | `{ item }`                                             | `Promise<T>`      | Insert a single document    |
| `insertMany`     | `{ items, options? }`                                  | `Promise<T[]>`    | Insert multiple documents   |
| `replaceOne`     | `{ item, options? }`                                   | `Promise<T>`      | Replace a document by `_id` |
| `replaceMany`    | `{ items, options? }`                                  | `Promise<T[]>`    | Replace multiple documents  |
| `deleteOne`      | `{ item, options? }`                                   | `Promise<T>`      | Delete a document by `_id`  |
| `deleteMany`     | `{ items, options? }`                                  | `Promise<T[]>`    | Delete multiple documents   |

## Document Mapping

Override the mapping methods to control how documents are converted between MongoDB format and your entity format:

```typescript
import { Document, ObjectId } from "mongodb";

class UserRepository extends MongoDBRepository<User> {
    constructor() {
        super(
            () => mongoManager.getCollection("myDatabase", "users"),
            User,
            "User"
        );
    }

    // Convert MongoDB document to entity
    override _mapDocumentToEntity(doc: Document): User {
        return User.parse({
            _id: doc._id.toString(),
            email: doc.email,
            firstName: doc.firstName,
            lastName: doc.lastName,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        });
    }

    // Convert entity to MongoDB document
    override _mapEntityToDocument(user: User): Document {
        return {
            _id: new ObjectId(user._id),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
        };
    }
}
```

## Query Examples

### Finding Documents

```typescript
// Find one by filter
const user = await userRepository.findOne({
    filter: { email: "john@example.com" },
});

// Find multiple with options
const users = await userRepository.find({
    filter: { lastName: "Doe" },
    limit: 10,
    skip: 0,
    sort: { createdAt: -1 },
});

// Count documents
const count = await userRepository.countDocuments({
    filter: { lastName: "Doe" },
});
```

### Creating Documents

```typescript
// Insert one
const newUser = await userRepository.insertOne({
    item: {
        _id: new ObjectId().toString(),
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
});

// Insert many
const users = await userRepository.insertMany({
    items: [user1, user2, user3],
});
```

### Updating Documents

```typescript
// Replace a document (must include _id)
const updatedUser = await userRepository.replaceOne({
    item: {
        ...existingUser,
        firstName: "Jonathan",
        updatedAt: new Date().toISOString(),
    },
});
```

### Deleting Documents

```typescript
// Delete one
const deletedUser = await userRepository.deleteOne({
    item: user,
});

// Delete many
const deletedUsers = await userRepository.deleteMany({
    items: [user1, user2],
});
```

## Error Handling

The repository automatically throws `NotFoundException` when:

-   `findOne` returns no results
-   `replaceOne` matches no documents
-   `deleteOne` deletes no documents

The exception includes entity-specific error codes:

```typescript
try {
    const user = await userRepository.findOne({
        filter: { _id: "nonexistent" },
    });
} catch (error) {
    // NotFoundException with:
    // - message: "User not found"
    // - details.errorCode: "USER_NOT_FOUND"
}
```

## Add Custom Methods

Just add new methods to the repository class as needed for your use cases.
For example if you need specific access patterns and want the consumer to be able to use them explicitly without having to provide filter logic.

Also aggregation pipelines can be added to the repository as custom methods.

::: tip
User the [CRUD+](/guide/mongodb/crud) methods provided by Nimbus to still have observability and error handling features baked in.
:::

```typescript
import { aggregate, MongoDBRepository } from "@nimbus/mongodb";

class UserRepository extends MongoDBRepository<User> {
    // ... existing code ...

    // Add custom methods to find a user by email
    public async findByEmail(email: string): Promise<User> {
        return this.findOne({ filter: { email } });
    }

    // Add custom methods which uses an aggregation pipeline
    public async getUserGroups(): Promise<UserGroup[]> {
        const collection = await this._getCollection();

        const result = await aggregate<UserGroup>({
            collection,
            aggregation: [
                {
                    $group: {
                        _id: "$group",
                        users: { $push: "$$ROOT" },
                    },
                },
            ],
            mapDocument: (doc: Document) => {
                return {
                    name: doc._id,
                    users: doc.users.map((user: Document) =>
                        this._mapDocumentToEntity(user)
                    ),
                };
            },
            outputType: UserGroup,
        });

        return result;
    }
}

export const userRepository = new UserRepository();
```
