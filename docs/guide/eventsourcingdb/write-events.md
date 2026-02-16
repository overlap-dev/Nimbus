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

::: info Example Application
The examples on this page reference the eventsourcing-demo application.

You can find the full example on GitHub: [eventsourcing-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/eventsourcing-demo)
:::

## Basic Usage

```typescript
import { createEvent } from "@nimbus/core";
import { writeEvents } from "@nimbus/eventsourcingdb";
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
