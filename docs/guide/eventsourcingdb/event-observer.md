---
description: initEventObserver runs a resilient background loop for new events — ideal for projections with automatic reconnect.
prev:
    text: "Read Events"
    link: "/guide/eventsourcingdb/read-events"

next:
    text: "Event Mapping"
    link: "/guide/eventsourcingdb/event-mapping"
---

# Event Observer

The `initEventObserver` function starts a background event observation loop that continuously listens for new events from EventSourcingDB. Observers automatically reconnect with exponential backoff on connection failure, and retry handler failures in-place without tearing down the stream — making them ideal for building read-side projections and reactive event handlers.

For full details on observing events, including resuming after connection loss and observing from the last event of a given type, see the [Observing Events](https://docs.eventsourcingdb.io/getting-started/observing-events/) section in the EventSourcingDB documentation.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

Event observers are typically configured as part of the [client setup](/guide/eventsourcingdb/client-setup):

```typescript
import { setupEventSourcingDBClient } from "@nimbus-cqrs/eventsourcingdb";
import type { Event } from "eventsourcingdb";

await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ""),
    apiToken: process.env.ESDB_API_TOKEN ?? "",
    eventObservers: [
        {
            subject: "/",
            recursive: true,
            eventHandler: (event: Event) => {
                console.log("Received event:", event);
            },
        },
    ],
});
```

You can also start an observer independently after the client has been initialized:

```typescript
import { initEventObserver } from "@nimbus-cqrs/eventsourcingdb";
import type { Event } from "eventsourcingdb";

initEventObserver({
    subject: "/users",
    recursive: true,
    eventHandler: async (event: Event) => {
        console.log("Received event:", event);
    },
});
```

## EventObserver Options

| Option                   | Type                                   | Default      | Description                                                       |
| ------------------------ | -------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `subject`                | `string`                               | _(required)_ | The subject to observe events for                                 |
| `recursive`              | `boolean`                              | `false`      | Whether to observe events recursively for all sub-subjects        |
| `lowerBound`             | `Bound`                                | `undefined`  | The starting position for observation                             |
| `fromLatestEvent`        | `ObserveFromLatestEvent`               | `undefined`  | Start observation from a specific latest event                    |
| `eventHandler`           | `(event: Event) => void`               | _(required)_ | Handler function called for each observed event                   |
| `retryOptions`           | `RetryOptions`                         | see below    | **Deprecated.** Alias for `connectionRetryOptions`                |
| `connectionRetryOptions` | `RetryOptions`                         | see below    | Retry options when the observe stream / connection fails          |
| `handlerRetryOptions`    | `RetryOptions`                         | see below    | Retry options when `eventHandler` throws (in-place, no reconnect) |
| `onHandlerError`         | `(error: Error, event: Event) => void` | `undefined`  | Called after handler retries are exhausted; event is then skipped |

### Bound

The `lowerBound` option defines where observation starts:

```typescript
{
    id: "last-processed-event-id",
    type: "exclusive", // or "inclusive"
}
```

| Property | Type                           | Description                              |
| -------- | ------------------------------ | ---------------------------------------- |
| `id`     | `string`                       | The event ID to start from               |
| `type`   | `"inclusive"` \| `"exclusive"` | Whether to include or exclude this event |

### ObserveFromLatestEvent

The `fromLatestEvent` option starts observation from the latest event matching specific criteria:

```typescript
{
    subject: "/users",
    type: "at.overlap.nimbus.user-invited",
    ifEventIsMissing: "read-everything", // or "wait-for-event"
}
```

| Property           | Type                                      | Description                              |
| ------------------ | ----------------------------------------- | ---------------------------------------- |
| `subject`          | `string`                                  | The subject to find the latest event for |
| `type`             | `string`                                  | The event type to match                  |
| `ifEventIsMissing` | `"read-everything"` \| `"wait-for-event"` | What to do if no matching event exists   |

## Retry Options

`connectionRetryOptions` and `handlerRetryOptions` share the same shape (defaults apply independently to each):

| Option                | Type     | Default | Description                                          |
| --------------------- | -------- | ------- | ---------------------------------------------------- |
| `maxRetries`          | `number` | `3`     | Maximum number of retries after the initial attempt  |
| `initialRetryDelayMs` | `number` | `3000`  | Initial delay in milliseconds before the first retry |

Both paths use **exponential backoff with jitter** (via the shared [`withRetry`](/guide/core/with-retry) / `calculateBackoffDelay` helpers from `@nimbus-cqrs/core`):

- Base delay doubles with each attempt: `initialDelayMs * 2^attempt`
- Random jitter of 0-30% is added to avoid thundering-herd effects

**Connection retries** (`connectionRetryOptions`, or deprecated `retryOptions`):

- Used when the observe stream fails or disconnects
- After the initial attempt plus `maxRetries` reconnect attempts fail, a critical error is logged and the observer stops (`maxRetries + 1` failed attempts total)
- The connection retry counter resets when events start flowing again

**Handler retries** (`handlerRetryOptions`):

- Used when `eventHandler` throws; retries happen in-place without reconnecting
- After the initial attempt plus `maxRetries` retries fail for an event, `onHandlerError` is called (if provided) or a critical log is emitted (`maxRetries + 1` failed attempts total)
- The event is then **skipped** (lower bound advanced) so subsequent events keep being processed

```typescript
import { getLogger } from "@nimbus-cqrs/core";
import { initEventObserver } from "@nimbus-cqrs/eventsourcingdb";

initEventObserver({
    subject: "/users",
    recursive: true,
    eventHandler: async (event) => {
        // ...
    },
    connectionRetryOptions: {
        maxRetries: 5,
        initialRetryDelayMs: 1000,
    },
    handlerRetryOptions: {
        maxRetries: 3,
        initialRetryDelayMs: 500,
    },
    onHandlerError: (error, event) => {
        getLogger().error({
            category: "EventObserver",
            message: `Skipping event after handler retries: ${event.id}`,
            error,
        });
    },
});
```

## Building Projections

A common use case for event observers is building read-side projections. The observer processes events and updates an in-memory or persistent view:

```typescript
import { Event, getLogger } from "@nimbus-cqrs/core";
import { eventSourcingDBEventToNimbusEvent } from "@nimbus-cqrs/eventsourcingdb";
import { Event as EventSourcingDBEvent } from "eventsourcingdb";

const USER_INVITED_EVENT_TYPE = "at.overlap.nimbus.user-invited";
const USER_INVITATION_ACCEPTED_EVENT_TYPE =
    "at.overlap.nimbus.user-invitation-accepted";

const usersStore = new Map();

export const projectViews = (eventSourcingDBEvent: EventSourcingDBEvent) => {
    const event =
        eventSourcingDBEventToNimbusEvent<Event>(eventSourcingDBEvent);

    switch (event.type) {
        case USER_INVITED_EVENT_TYPE: {
            usersStore.set(event.data.id, {
                id: event.data.id,
                revision: event.id,
                email: event.data.email,
                firstName: event.data.firstName,
                lastName: event.data.lastName,
                invitedAt: event.data.invitedAt,
                acceptedAt: null,
            });
            break;
        }
        case USER_INVITATION_ACCEPTED_EVENT_TYPE: {
            const id = event.subject.split("/")[2];
            const currentRow = usersStore.get(id);

            usersStore.set(id, {
                ...currentRow,
                revision: event.id,
                acceptedAt: event.data.acceptedAt,
            });
            break;
        }
        default: {
            getLogger().warn({
                category: "ProjectViews",
                message: `Unknown event type ${event.type}`,
            });
            break;
        }
    }
};
```

Then register this projection handler as an event observer:

```typescript
await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ""),
    apiToken: process.env.ESDB_API_TOKEN ?? "",
    eventObservers: [
        {
            subject: "/",
            recursive: true,
            eventHandler: projectViews,
        },
    ],
});
```

## Automatic Position Tracking

The observer automatically tracks its position in the event stream. After each event is handled successfully **or skipped** after exhausted handler retries, the `lowerBound` is updated so that reconnections resume from that position rather than replaying the entire stream.

## OpenTelemetry Tracing

Each observed event is processed within an OpenTelemetry consumer span named `eventsourcingdb.observeEvent`. If the event carries a `traceparent` (injected by `writeEvents`), the span is linked to the original writer's trace, enabling end-to-end distributed tracing across the write and read sides.

**Span attributes** (include identifying CloudEvents fields):

- `cloudevents.event_id`
- `cloudevents.event_type`
- `cloudevents.event_subject`
- `eventsourcingdb.observer.subject`
- Handler retries add a `retry` span event (`attempt`, `delay_ms`)

**Metrics** (labels use `subject` + `event_type` where an event is in scope; connection metrics use `subject` only — no `event_id` on metric labels):

| Metric                                                     | Type      | Labels                            | Description                                                |
| ---------------------------------------------------------- | --------- | --------------------------------- | ---------------------------------------------------------- |
| `eventsourcingdb_observer_events_handled_total`            | Counter   | `subject`, `event_type`, `status` | Events handled (`success`) or skipped after exhaustion     |
| `eventsourcingdb_observer_handling_duration_seconds`       | Histogram | `subject`, `event_type`           | Handler duration in seconds (includes retries)             |
| `eventsourcingdb_observer_handler_retry_attempts_total`    | Counter   | `subject`, `event_type`           | In-place handler retry attempts                            |
| `eventsourcingdb_observer_connection_retry_attempts_total` | Counter   | `subject`                         | Stream failures that schedule a reconnect                  |
| `eventsourcingdb_observer_connection_reconnects_total`     | Counter   | `subject`                         | Successful reconnects after one or more connection retries |
