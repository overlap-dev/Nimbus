---
prev:
    text: "MongoJSON"
    link: "/guide/mongodb/mongo-json"

next:
    text: "Deploy Collection"
    link: "/guide/mongodb/deploy-collection"
---

# handleMongoError

The `handleMongoError` function converts MongoDB errors to Nimbus exceptions based on the error code. This provides consistent error handling across your application.

## Basic Usage

```typescript
import { handleMongoError } from "@nimbus/mongodb";

try {
    await collection.insertOne(document);
} catch (error) {
    throw handleMongoError(error);
}
```

## Error Code Mappings

| MongoDB Code | Error Type          | Nimbus Exception        | Details Included  |
| ------------ | ------------------- | ----------------------- | ----------------- |
| 121          | Document validation | `InvalidInputException` | `code`, `details` |
| 2            | Bad value           | `InvalidInputException` | Error message     |
| 11000        | Duplicate key       | `InvalidInputException` | `keyValue`        |
| Other        | Various             | `GenericException`      | Original error    |

## Error Examples

### Duplicate Key Error (Code 11000)

When inserting a document that violates a unique index:

```typescript
try {
    await collection.insertOne({ email: "existing@example.com" });
} catch (error) {
    const exception = handleMongoError(error);
    // InvalidInputException with:
    // - message: "E11000 duplicate key error..."
    // - details: { keyValue: { email: "existing@example.com" } }
}
```

### Document Validation Error (Code 121)

When a document fails schema validation:

```typescript
try {
    await collection.insertOne({ name: 123 }); // name should be string
} catch (error) {
    const exception = handleMongoError(error);
    // InvalidInputException with:
    // - message: "Document failed validation"
    // - details: { code: 121, details: { ... validation errors ... } }
}
```

### Bad Value Error (Code 2)

When a query contains invalid values:

```typescript
try {
    await collection.find({ $invalid: true }).toArray();
} catch (error) {
    const exception = handleMongoError(error);
    // InvalidInputException with original error message
}
```

### Other Errors

All other MongoDB errors are wrapped in a `GenericException`:

```typescript
try {
    await collection.find({}).toArray();
} catch (error) {
    const exception = handleMongoError(error);
    // GenericException with original error stack trace
}
```

## Integration with CRUD Functions

All [CRUD functions](/guide/mongodb/crud) use `handleMongoError` internally:

```typescript
import { insertOne } from "@nimbus/mongodb";

try {
    await insertOne({
        collection,
        document: { email: "duplicate@example.com" },
    });
} catch (error) {
    // Error is already a Nimbus exception
    if (error.name === "INVALID_INPUT") {
        // Handle duplicate key or validation error
    }
}
```

## Custom Error Handling

You can use `handleMongoError` in your own database operations:

```typescript
import { handleMongoError } from "@nimbus/mongodb";
import { GenericException } from "@nimbus/core";

const customDatabaseOperation = async (collection: Collection) => {
    try {
        // Custom MongoDB operation
        const result = await collection
            .aggregate([
                { $match: { status: "active" } },
                { $group: { _id: "$category", total: { $sum: "$amount" } } },
            ])
            .toArray();

        return result;
    } catch (error) {
        throw handleMongoError(error);
    }
};
```

## Error Response in API

When combined with the Hono [error handler](/guide/hono/on-error), MongoDB errors are automatically converted to HTTP responses:

```typescript
// Duplicate key error becomes:
// HTTP 400
{
    "error": "INVALID_INPUT",
    "message": "E11000 duplicate key error collection: db.users index: email_1 dup key: { email: \"existing@example.com\" }",
    "details": {
        "keyValue": {
            "email": "existing@example.com"
        }
    }
}
```
