---
prev:
    text: "Commands"
    link: "/guide/core/commands"

next:
    text: "Events"
    link: "/guide/core/events"
---

# Queries

Queries represent read operations - requests for information without changing application state.

Queries also fit perfectly into the CQRS pattern (Command Query Responsibility Segregation), where reads and writes are separated for better scalability and maintainability. But keep it simple for your use case and needs. CQRS in an option, but not required.

::: info Example Application
The examples on this page reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## Key Characteristics

-   **Read Operations**: Queries fetch data without modifying state
-   **Idempotent**: Multiple executions return the same result (if data hasn't changed)
-   **Type-Safe**: Queries are fully typed and validated using Zod
-   **Optimized for Reading**: Can use specialized read models or databases

## Query Structure

A query in Nimbus follows the CloudEvents specification and consists of:

```typescript
type Query<TData = unknown> = {
    specversion: "1.0";
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};
```

| Property          | Description                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `specversion`     | The CloudEvents specification version (always `'1.0'`)                           |
| `id`              | A globally unique identifier for the query                                       |
| `correlationid`   | A unique identifier to correlate this query with related messages                |
| `time`            | ISO 8601 timestamp when the query was created                                    |
| `source`          | A URI reference identifying the system creating the query                        |
| `type`            | The query type following CloudEvents naming (e.g., `at.overlap.nimbus.get-user`) |
| `data`            | The query parameters (e.g., filters, pagination)                                 |
| `datacontenttype` | Optional MIME type of the data (defaults to `application/json`)                  |
| `dataschema`      | Optional URL to the schema the data adheres to                                   |

## Query Schema

Nimbus provides a base Zod schema for validating queries:

```typescript
import { querySchema } from "@nimbus/core";
import { z } from "zod";

// Extend the base schema with your specific query type and data
const getUserQuerySchema = querySchema.extend({
    type: z.literal("at.overlap.nimbus.get-user"),
    data: z.object({
        id: z.string().length(24),
    }),
});

type GetUserQuery = z.infer<typeof getUserQuerySchema>;
```

## Create Queries

You can create queries using the `createQuery()` helper:

```typescript
import { createQuery } from "@nimbus/core";
import { GetUserQuery } from "./getUser.query.ts";

const query = createQuery<GetUserQuery>({
    type: "at.overlap.nimbus.get-user",
    source: "nimbus.overlap.at",
    data: {
        id: "123",
    },
});
```

The `createQuery()` helper automatically generates default values for:

-   `id` - A unique ULID
-   `correlationid` - A unique ULID (if not provided)
-   `time` - Current ISO timestamp
-   `specversion` - Always `'1.0'`
-   `datacontenttype` - Defaults to `'application/json'`

## Routing Queries

Queries are routed to handlers using the [MessageRouter](/guide/core/router). See the Router documentation for details on registering handlers and routing messages.
