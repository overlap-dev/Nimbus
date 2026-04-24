---
prev:
    text: "Client Setup"
    link: "/guide/eventsourcingdb/client-setup"

next:
    text: "Read Events"
    link: "/guide/eventsourcingdb/read-events"
---

# Write Events

The `writeEvents` function persists one or more Nimbus events to EventSourcingDB. It automatically converts Nimbus events to EventSourcingDB event candidates, injects OpenTelemetry trace context, and supports preconditions for optimistic concurrency control.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

```typescript
import { createEvent } from "@nimbus-cqrs/core";
import { writeEvents } from "@nimbus-cqrs/eventsourcingdb";
import { isSubjectPristine } from "eventsourcingdb";

const event = createEvent({
    type: "at.overlap.nimbus.user-invited",
    source: "nimbus.overlap.at",
    correlationid: command.correlationid,
    subject: `/users/${id}`,
    data: {
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        invitedAt: new Date().toISOString(),
    },
});

await writeEvents([event], [isSubjectPristine(event.subject)]);
```

## Function Parameters

| Parameter       | Type             | Description                                                      |
| --------------- | ---------------- | ---------------------------------------------------------------- |
| `events`        | `Event[]`        | An array of Nimbus events to write                               |
| `preconditions` | `Precondition[]` | Optional preconditions that must be met for the write to succeed |

## Preconditions

EventSourcingDB supports the following preconditions. For full details, see the [Using Preconditions](https://docs.eventsourcingdb.io/getting-started/writing-events/#using-preconditions) section in the EventSourcingDB documentation.

To use these preconditions, you can directly import them from the [`EventSourcingDB JavaScript SDK`](https://www.npmjs.com/package/eventsourcingdb).

## OpenTelemetry Tracing

Every call to `writeEvents` is automatically wrapped in an OpenTelemetry span named `eventsourcingdb.writeEvents`. The current trace context (`traceparent` and `tracestate`) is injected into each event candidate, enabling end-to-end distributed tracing from the event writer to any [event observer](/guide/eventsourcingdb/event-observer) that processes the event.

The following metrics are recorded:

| Metric                                       | Type      | Labels                | Description                             |
| -------------------------------------------- | --------- | --------------------- | --------------------------------------- |
| `eventsourcingdb_operation_total`            | Counter   | `operation`, `status` | Total number of write operations        |
| `eventsourcingdb_operation_duration_seconds` | Histogram | `operation`           | Duration of write operations in seconds |
