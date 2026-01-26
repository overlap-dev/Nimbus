---
prev:
    text: "CRUD+"
    link: "/guide/mongodb/crud"

next:
    text: "handleMongoError"
    link: "/guide/mongodb/handle-mongo-error"
---

# MongoJSON

`MongoJSON` provides parse and stringify functions with support for MongoDB data types. It allows you to serialize MongoDB filters and documents as JSON strings while preserving type information.

## Basic Usage

```typescript
import { MongoJSON } from "@nimbus/mongodb";

// Parse a JSON string with MongoDB type prefixes
const filter = MongoJSON.parse('{"_id": "objectId::507f1f77bcf86cd799439011"}');
// Result: { _id: ObjectId("507f1f77bcf86cd799439011") }

// Stringify an object to JSON
const json = MongoJSON.stringify({ name: "John", age: 30 });
// Result: '{"name":"John","age":30}'
```

## Type Prefixes

The `parse` function recognizes special prefixes to convert strings to MongoDB types:

| Prefix       | Converts To | Example                                |
| ------------ | ----------- | -------------------------------------- |
| `objectId::` | `ObjectId`  | `"objectId::507f1f77bcf86cd799439011"` |
| `date::`     | `Date`      | `"date::2024-01-15T10:30:00Z"`         |
| `int::`      | `number`    | `"int::42"`                            |
| `double::`   | `number`    | `"double::19.99"`                      |

## Parse Examples

```typescript
import { MongoJSON } from "@nimbus/mongodb";

// ObjectId conversion
const idFilter = MongoJSON.parse(
    '{"_id": "objectId::507f1f77bcf86cd799439011"}'
);
// { _id: ObjectId("507f1f77bcf86cd799439011") }

// Date conversion
const dateFilter = MongoJSON.parse(
    '{"createdAt": {"$gte": "date::2024-01-01T00:00:00Z"}}'
);
// { createdAt: { $gte: Date("2024-01-01T00:00:00Z") } }

// Integer conversion
const countFilter = MongoJSON.parse('{"count": {"$gt": "int::100"}}');
// { count: { $gt: 100 } }

// Multiple types
const complexFilter = MongoJSON.parse(`{
    "_id": "objectId::507f1f77bcf86cd799439011",
    "price": {"$lte": "double::49.99"},
    "createdAt": {"$gte": "date::2024-01-01T00:00:00Z"},
    "quantity": {"$gt": "int::0"}
}`);
```

## Operator Blacklist

For security, `MongoJSON.parse` blocks certain MongoDB operators by default:

```typescript
// This will throw an error
MongoJSON.parse('{"$where": "this.name === \\"admin\\""}');
// Error: Operator '$where' is not allowed

// Custom blacklist
MongoJSON.parse(jsonString, ["$where", "$expr"]);
```

The default blacklist includes `$where` to prevent code injection attacks.

## Use Case: API Filters

`MongoJSON` is useful when accepting MongoDB filters from API requests:

```typescript
import { MongoJSON } from "@nimbus/mongodb";

app.get("/users", async (c) => {
    const filterParam = c.req.query("filter");

    // Parse the filter from query string
    const filter = filterParam ? MongoJSON.parse(filterParam) : {};

    const users = await userRepository.find({ filter });
    return c.json(users);
});

// Example request:
// GET /users?filter={"status":"active","createdAt":{"$gte":"date::2024-01-01T00:00:00Z"}}
```

## Error Handling

`MongoJSON.parse` throws an `InvalidInputException` for:

-   Invalid JSON syntax
-   Blacklisted operators

```typescript
import { MongoJSON } from "@nimbus/mongodb";

try {
    const filter = MongoJSON.parse('{"invalid json}');
} catch (error) {
    // InvalidInputException with JSON parse error details
}

try {
    const filter = MongoJSON.parse('{"$where": "1===1"}');
} catch (error) {
    // Error: Operator '$where' is not allowed
}
```
