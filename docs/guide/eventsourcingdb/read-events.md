---
prev:
    text: "Write Events"
    link: "/guide/eventsourcingdb/write-events"

next:
    text: "Event Observer"
    link: "/guide/eventsourcingdb/event-observer"
---

# Read Events

The `readEvents` function reads events from EventSourcingDB for a given subject. It returns an async generator that yields raw EventSourcingDB events, which can be converted to Nimbus events using the [event mapping](/guide/eventsourcingdb/event-mapping) utilities.

For full details on reading events, including reading from multiple subjects, reading in reverse order, reading specific ranges, and reading from the last event of a given type, see the [Reading Events](https://docs.eventsourcingdb.io/getting-started/reading-events/) section in the EventSourcingDB documentation.

::: info Example Application
The examples on this page reference the eventsourcing-demo application.

You can find the full example on GitHub: [eventsourcing-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/eventsourcing-demo)
:::

## Basic Usage

```typescript
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
} from "@nimbus-cqrs/eventsourcingdb";

for await (const eventSourcingDBEvent of readEvents("/users/123", {
    recursive: false,
})) {
    const event = eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent);
    console.log(event);
}
```

## Function Parameters

| Parameter | Type                | Description                                      |
| --------- | ------------------- | ------------------------------------------------ |
| `subject` | `string`            | The subject to read events for                   |
| `options` | `ReadEventsOptions` | Options to control which events are read         |
| `signal`  | `AbortSignal`       | Optional abort signal to cancel the read         |

## Rebuilding Aggregate State

A common pattern in event sourcing is to rebuild an aggregate's state by replaying all of its events. This is used in command handlers to load the current state before making decisions:

```typescript
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
    writeEvents,
} from "@nimbus-cqrs/eventsourcingdb";
import { isSubjectOnEventId } from "eventsourcingdb";

const acceptUserInvitationCommandHandler = async (command) => {
    let state: UserState = { id: command.data.id };

    // Replay all events to rebuild the current state
    for await (
        const eventSourcingDBEvent of readEvents(
            `/users/${command.data.id}`,
            { recursive: false },
        )
    ) {
        const event = eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent);
        state = applyEventToUserState(state, event);
    }

    // Use the rebuilt state to make decisions
    const events = acceptUserInvitation(state, command);

    // Write new events with optimistic concurrency
    await writeEvents(events, [
        isSubjectOnEventId(
            events[0].subject,
            command.data.expectedRevision,
        ),
    ]);
};
```

## Cancellation

Use an `AbortSignal` to cancel an in-progress read:

```typescript
import { readEvents } from "@nimbus-cqrs/eventsourcingdb";

const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

for await (const event of readEvents(
    "/users",
    { recursive: true },
    controller.signal,
)) {
    console.log(event);
}
```

## OpenTelemetry Tracing

Every call to `readEvents` is automatically wrapped in an OpenTelemetry span named `eventsourcingdb.readEvents`. The following metrics are recorded:

| Metric                                       | Type      | Labels               | Description                               |
| -------------------------------------------- | --------- | -------------------- | ----------------------------------------- |
| `eventsourcingdb_operation_total`             | Counter   | `operation`, `status` | Total number of read operations           |
| `eventsourcingdb_operation_duration_seconds`  | Histogram | `operation`          | Duration of read operations in seconds    |
