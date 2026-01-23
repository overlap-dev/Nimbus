---
prev:
    text: "Queries"
    link: "/guide/core/queries"

next:
    text: "Router"
    link: "/guide/core/router"
---

# Events

Events represent facts - things that have already happened in the system.

Events are immutable records of state changes that occurred in the application. They enable event-driven architectures, event sourcing, and asynchronous processing.

::: info Example Application
The examples on this page reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## Key Characteristics

-   **Immutable Facts**: Events represent things that already happened and cannot be changed
-   **Past Tense**: Event names use past tense (e.g., "UserAdded", not "AddUser")
-   **Observable**: Other parts of the system can subscribe and react to events
-   **Type-Safe**: Events are fully typed and validated using Zod

## Event Structure

An event in Nimbus follows the CloudEvents specification and consists of:

```typescript
type Event<TData = unknown> = {
    specversion: "1.0";
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    subject: string;
    data: TData;
    datacontenttype?: string;
    dataschema?: string;
};
```

| Property          | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `specversion`     | The CloudEvents specification version (always `'1.0'`)                             |
| `id`              | A globally unique identifier for the event                                         |
| `correlationid`   | A unique identifier to correlate this event with related messages                  |
| `time`            | ISO 8601 timestamp when the event was created                                      |
| `source`          | A URI reference identifying the system creating the event                          |
| `type`            | The event type following CloudEvents naming (e.g., `at.overlap.nimbus.user-added`) |
| `subject`         | An identifier for the entity the event is about (e.g., `/users/123`)               |
| `data`            | The event payload containing the business data                                     |
| `datacontenttype` | Optional MIME type of the data (defaults to `application/json`)                    |
| `dataschema`      | Optional URL to the schema the data adheres to                                     |

## Event Subjects

Unlike commands and queries, events **require** a `subject` field.  
Events use subjects to organize and identify the entities they relate to:

```typescript
// Subject examples
"/users/123"; // Specific user
"/orders/456"; // Specific order
"/users/123/orders/456"; // Order belonging to a user
```

## Event Schema

Nimbus provides a base Zod schema for validating events:

```typescript
import { eventSchema } from "@nimbus/core";
import { z } from "zod";

// Extend the base schema with your specific event type and data
const userAddedEventSchema = eventSchema.extend({
    type: z.literal("at.overlap.nimbus.user-added"),
    data: z.object({
        _id: z.string(),
        email: z.string(),
        firstName: z.string(),
        lastName: z.string(),
    }),
});

type UserAddedEvent = z.infer<typeof userAddedEventSchema>;
```

## Create Events

You can create events using the `createEvent()` helper:

```typescript
import { createEvent } from "@nimbus/core";
import { UserAddedEvent } from "./userAdded.event.ts";

const event = createEvent<UserAddedEvent>({
    type: "at.overlap.nimbus.user-added",
    source: "nimbus.overlap.at",
    correlationid: command.correlationid,
    subject: `/users/${userState._id}`,
    data: userState,
});
```

The `createEvent()` helper automatically generates default values for:

-   `id` - A unique ULID
-   `correlationid` - A unique ULID (if not provided)
-   `time` - Current ISO timestamp
-   `specversion` - Always `'1.0'`
-   `datacontenttype` - Defaults to `'application/json'`

## Best Practices

### Use Past Tense Names

Event names should describe what happened, not what should happen:

```typescript
// ✅ Good - Past tense
UserAddedEvent;
OrderShippedEvent;
PaymentProcessedEvent;

// ❌ Bad - Imperative
AddUserEvent;
ShipOrderEvent;
ProcessPaymentEvent;
```

### Propagate Correlation IDs

Always pass correlation IDs from commands to events for tracing:

```typescript
const event = createEvent<UserAddedEvent>({
    type: USER_ADDED_EVENT_TYPE,
    source: "nimbus.overlap.at",
    correlationid: command.correlationid, // Always propagate
    data: state,
});
```

### Use Meaningful Subjects

Subjects should be hierarchical and meaningful:

```typescript
// ✅ Good - Hierarchical and clear
`/users/${userId}``/users/${userId}/orders/${orderId}``/organizations/${orgId}/members/${memberId}` // ❌ Bad - Flat and unclear
`user-${userId}``order_${orderId}`;
```

## Publish & Subscribe Events

Events are published and subscribed to using the [EventBus](/guide/core/event-bus). See the EventBus documentation for details on publishing and subscribing to events.
