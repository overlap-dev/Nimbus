---
prev:
    text: "Observability"
    link: "/guide/core/observability"

next:
    text: "Queries"
    link: "/guide/core/queries"
---

# Commands

Commands represent write operations - intentions to change system state in the application.

Commands also fit perfectly into the CQRS pattern (Command Query Responsibility Segregation), where writes and reads are separated for better scalability and maintainability. But keep it simple for your use case and needs. CQRS in an option, but not required.

::: info Example Application
The examples on this page reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## Key Characteristics

-   **Write Operations**: Commands modify application state
-   **Intent-Based**: Commands express what should happen (e.g., "AddUser", "DeleteUser")
-   **Type-Safe**: Commands are fully typed and validated using Zod

## Command Structure

A command in Nimbus follows the CloudEvents specification and consists of:

```typescript
type Command<TData = unknown> = {
    specversion: "1.0";
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    subject?: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};
```

| Property          | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `specversion`     | The CloudEvents specification version (always `'1.0'`)                             |
| `id`              | A globally unique identifier for the command                                       |
| `correlationid`   | A unique identifier to correlate this command with related messages                |
| `time`            | ISO 8601 timestamp when the command was created                                    |
| `source`          | A URI reference identifying the system creating the command                        |
| `type`            | The command type following CloudEvents naming (e.g., `at.overlap.nimbus.add-user`) |
| `subject`         | Optional identifier for the entity the command targets                             |
| `data`            | The command payload containing the business data                                   |
| `datacontenttype` | Optional MIME type of the data (defaults to `application/json`)                    |
| `dataschema`      | Optional URL to the schema the data adheres to                                     |

## Command Schema

Nimbus provides a base Zod schema for validating commands:

```typescript
import { commandSchema } from "@nimbus/core";
import { z } from "zod";

// Extend the base schema with your specific command type and data
const addUserCommandSchema = commandSchema.extend({
    type: z.literal("at.overlap.nimbus.add-user"),
    data: z.object({
        email: z.email(),
        firstName: z.string(),
        lastName: z.string(),
    }),
});

type AddUserCommand = z.infer<typeof addUserCommandSchema>;
```

## Create Commands

You can create commands using the `createCommand()` helper:

```typescript
import { createCommand } from "@nimbus/core";
import { AddUserCommand } from "./addUser.command.ts";

const commandForJane = createCommand<AddUserCommand>({
    type: "at.overlap.nimbus.add-user",
    source: "nimbus.overlap.at",
    data: {
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
    },
});

const commandForJohn = createCommand<AddUserCommand>({
    type: "at.overlap.nimbus.add-user",
    source: "nimbus.overlap.at",
    data: {
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
    },
});
```

The `createCommand()` helper automatically generates default values for:

-   `id` - A unique ULID
-   `correlationid` - A unique ULID (if not provided)
-   `time` - Current ISO timestamp
-   `specversion` - Always `'1.0'`
-   `datacontenttype` - Defaults to `'application/json'`

## Routing Commands

Commands are routed to handlers using the [MessageRouter](/guide/core/router). See the Router documentation for details on registering handlers and routing messages.
