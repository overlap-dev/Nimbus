---
prev:
    text: "Events"
    link: "/guide/core/events"

next:
    text: "Event Bus"
    link: "/guide/core/event-bus"
---

# Router

The MessageRouter is responsible for routing incoming messages (commands, queries, and events) to their registered handlers. It provides automatic validation, type safety, and observability for all routed messages.

::: info Example Application
The examples on this page reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## Setup and Configuration

Configure the router at application startup using `setupRouter()`, then retrieve it anywhere using `getRouter()`.

```typescript
import { getLogger, setupRouter } from "@nimbus/core";

setupRouter("MyRouter", {
    logInput: (input) => {
        getLogger().debug({
            category: "MyRouter",
            message: "Received input",
            data: { input },
            ...(input?.correlationid
                ? { correlationId: input.correlationid }
                : {}),
        });
    },
    logOutput: (output) => {
        getLogger().debug({
            category: "MyRouter",
            message: "Output",
            data: { output },
            ...(output?.correlationid
                ? { correlationId: output.correlationid }
                : {}),
        });
    },
});
```

### Configuration Options

| Option      | Type                    | Description                                          |
| ----------- | ----------------------- | ---------------------------------------------------- |
| `logInput`  | `(input: any) => void`  | Optional callback invoked when a message is received |
| `logOutput` | `(output: any) => void` | Optional callback invoked after successful handling  |

## Registering Handlers

Register handlers for message types using the `register()` method:

```typescript
import { getRouter } from "@nimbus/core";

export const registerUserMessages = () => {
    const router = getRouter("MyRouter");

    // Register a command
    router.register(
        "at.overlap.nimbus.add-user",
        async (command: AddUserCommand) => {
            // Process command and return result
        },
        addUserCommandSchema
    );

    // Register an event
    router.register(
        "at.overlap.nimbus.user-added",
        async (event: UserAddedEvent) => {
            // Process event and return result
        },
        addUserCommandSchema
    );

    // Register a query
    router.register(
        "at.overlap.nimbus.get-user",
        async (query: GetUserQuery) => {
            // Process query and return result
        },
        getUserQuerySchema
    );
};
```

The `register()` method takes three arguments:

| Argument      | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `messageType` | The CloudEvents type string (e.g., `'at.overlap.nimbus.add-user'`) |
| `handler`     | An async function that processes the message and returns a result  |
| `schema`      | A Zod schema used to validate the incoming message                 |

## Routing Messages

Route messages to their handlers using the `route()` method:

```typescript
import { createCommand, getRouter } from "@nimbus/core";

const command = createCommand<AddUserCommand>({
    type: "at.overlap.nimbus.add-user",
    source: "nimbus.overlap.at",
    correlationid: httpRequestCorrelationId,
    data: httpRequestBody,
});

const router = getRouter("MyRouter");

const result = await router.route(command);
```

## Validation

The router automatically validates incoming messages against their registered schemas:

1. **Message Type Check**: Verifies the message has a `type` attribute
2. **Handler Lookup**: Finds the registered handler for the message type
3. **Schema Validation**: Validates the message against the Zod schema
4. **Handler Execution**: Passes the validated message to the handler

If validation fails, an `InvalidInputException` is thrown with details about the validation errors:

```typescript
{
    name: 'INVALID_INPUT',
    message: 'The provided input is invalid',
    statusCode: 400,
    details: {
        issues: [
            { path: ['data', 'email'], message: 'Invalid email' }
        ]
    }
}
```

## Error Handling

The router throws appropriate exceptions for different error conditions:

| Error              | Exception               | Description                                   |
| ------------------ | ----------------------- | --------------------------------------------- |
| Missing type       | `InvalidInputException` | The message has no `type` attribute           |
| Unknown type       | `NotFoundException`     | No handler registered for the message type    |
| Validation failure | `InvalidInputException` | The message failed schema validation          |
| Handler error      | _(propagated)_          | Errors from handlers are propagated unchanged |

## Observability

The router is fully instrumented with OpenTelemetry tracing and metrics. See the [Observability](/guide/core/observability) documentation for details.

**Tracing**:

-   Automatic spans for every routed message

**Metrics**:

-   `router_messages_routed_total` counter
-   `router_routing_duration_seconds` histogram
