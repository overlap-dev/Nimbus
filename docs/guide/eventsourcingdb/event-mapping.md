---
prev:
    text: "Event Observer"
    link: "/guide/eventsourcingdb/event-observer"

next:
    text: "Nimbus MongoDB"
    link: "/guide/mongodb"
---

# Event Mapping

The event mapping utilities convert between Nimbus events and EventSourcingDB events. When writing events, Nimbus metadata (correlation ID, data schema) is preserved alongside the payload. When reading events back, the original Nimbus event structure is restored.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## How Events Are Stored

When a Nimbus event is written to EventSourcingDB, its `data` field is wrapped in a structure that preserves Nimbus-specific metadata:

```typescript
// Original Nimbus event data
{
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
}

// Stored in EventSourcingDB as
{
    payload: {
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
    },
    nimbusMeta: {
        correlationid: "01JKXYZ...",
        dataschema: "https://example.com/schemas/user-invited",
    },
}
```

## Types

### EventData

The wrapper structure used to store Nimbus events in EventSourcingDB:

```typescript
type EventData = {
    payload: Record<string, unknown>;
    nimbusMeta: NimbusEventMetadata;
};
```

### NimbusEventMetadata

Metadata that Nimbus attaches to events stored in EventSourcingDB:

```typescript
type NimbusEventMetadata = {
    correlationid: string;
    dataschema?: string;
};
```

## Converting Nimbus Events to EventSourcingDB

The `nimbusEventToEventSourcingDBEventCandidate` function converts a Nimbus event into an EventSourcingDB event candidate:

```typescript
import { nimbusEventToEventSourcingDBEventCandidate } from "@nimbus-cqrs/eventsourcingdb";

const eventCandidate = nimbusEventToEventSourcingDBEventCandidate(nimbusEvent);
```

The conversion maps the following properties:

| Nimbus Event     | EventSourcingDB Event Candidate |
| ---------------- | ------------------------------- |
| `source`         | `source`                        |
| `subject`        | `subject`                       |
| `type`           | `type`                          |
| `data`           | `data.payload`                  |
| `correlationid`  | `data.nimbusMeta.correlationid` |
| `dataschema`     | `data.nimbusMeta.dataschema`    |

::: tip
You typically don't need to call this function directly. The [`writeEvents`](/guide/eventsourcingdb/write-events) function handles the conversion internally.
:::

## Converting EventSourcingDB Events to Nimbus

The `eventSourcingDBEventToNimbusEvent` function converts an EventSourcingDB event back into a Nimbus event:

```typescript
import { eventSourcingDBEventToNimbusEvent } from "@nimbus-cqrs/eventsourcingdb";
import type { Event } from "eventsourcingdb";

const handleEvent = (eventSourcingDBEvent: Event) => {
    const nimbusEvent = eventSourcingDBEventToNimbusEvent(eventSourcingDBEvent);

    console.log(nimbusEvent.correlationid); // Restored from nimbusMeta
    console.log(nimbusEvent.data); // Original payload
};
```

The function supports generic typing for specific event types:

```typescript
import { Event } from "@nimbus-cqrs/core";
import { eventSourcingDBEventToNimbusEvent } from "@nimbus-cqrs/eventsourcingdb";

const event = eventSourcingDBEventToNimbusEvent<Event>(eventSourcingDBEvent);
```

### Handling Non-Nimbus Events

If the EventSourcingDB event was not written by Nimbus (i.e., it does not contain the `nimbusMeta` wrapper), the function gracefully handles this by:

- Treating the entire `data` field as the payload
- Generating a new correlation ID using ULID

## Type Guard

The `isEventData` type guard checks whether event data conforms to the `EventData` structure:

```typescript
import { isEventData } from "@nimbus-cqrs/eventsourcingdb";

if (isEventData(event.data)) {
    // event.data is typed as EventData
    console.log(event.data.payload);
    console.log(event.data.nimbusMeta.correlationid);
}
```
