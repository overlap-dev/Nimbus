---
prev:
    text: "Read Events"
    link: "/guide/eventsourcingdb/read-events"

next:
    text: "Event Mapping"
    link: "/guide/eventsourcingdb/event-mapping"
---

# Event Observer

The `initEventObserver` function starts a background event observation loop that continuously listens for new events from EventSourcingDB. Observers automatically reconnect with exponential backoff on failure, making them ideal for building read-side projections and reactive event handlers.

For full details on observing events, including resuming after connection loss and observing from the last event of a given type, see the [Observing Events](https://docs.eventsourcingdb.io/getting-started/observing-events/) section in the EventSourcingDB documentation.

::: info Example Application
The examples on this page reference the eventsourcing-demo application.

You can find the full example on GitHub: [eventsourcing-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/eventsourcing-demo)
:::

## Basic Usage

Event observers are typically configured as part of the [client setup](/guide/eventsourcingdb/client-setup):

```typescript
import { setupEventSourcingDBClient } from "@nimbus/eventsourcingdb";
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
import { initEventObserver } from "@nimbus/eventsourcingdb";
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

| Option             | Type                       | Default     | Description                                                  |
| ------------------ | -------------------------- | ----------- | ------------------------------------------------------------ |
| `subject`          | `string`                   | _(required)_ | The subject to observe events for                            |
| `recursive`        | `boolean`                  | `false`     | Whether to observe events recursively for all sub-subjects   |
| `lowerBound`       | `Bound`                    | `undefined` | The starting position for observation                        |
| `fromLatestEvent`  | `ObserveFromLatestEvent`   | `undefined` | Start observation from a specific latest event               |
| `eventHandler`     | `(event: Event) => void`   | _(required)_ | Handler function called for each observed event              |
| `retryOptions`     | `RetryOptions`             | see below   | Options for retry behavior on connection failure             |

### Bound

The `lowerBound` option defines where observation starts:

```typescript
{
    id: "last-processed-event-id",
    type: "exclusive", // or "inclusive"
}
```

| Property | Type                          | Description                             |
| -------- | ----------------------------- | --------------------------------------- |
| `id`     | `string`                      | The event ID to start from              |
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

| Property           | Type                                       | Description                                          |
| ------------------ | ------------------------------------------ | ---------------------------------------------------- |
| `subject`          | `string`                                   | The subject to find the latest event for             |
| `type`             | `string`                                   | The event type to match                              |
| `ifEventIsMissing` | `"read-everything"` \| `"wait-for-event"`  | What to do if no matching event exists               |

## Retry Options

| Option               | Type     | Default | Description                                              |
| -------------------- | -------- | ------- | -------------------------------------------------------- |
| `maxRetries`         | `number` | `3`     | Maximum number of retry attempts before giving up        |
| `initialRetryDelayMs`| `number` | `3000`  | Initial delay in milliseconds before the first retry     |

The observer uses **exponential backoff with jitter** for retries:

- Base delay doubles with each attempt: `initialDelayMs * 2^attempt`
- Random jitter of 0-30% is added to avoid thundering-herd effects
- After `maxRetries` consecutive failures, a critical error is logged and the observer stops

## Building Projections

A common use case for event observers is building read-side projections. The observer processes events and updates an in-memory or persistent view:

```typescript
import { Event, getLogger } from "@nimbus/core";
import { eventSourcingDBEventToNimbusEvent } from "@nimbus/eventsourcingdb";
import { Event as EventSourcingDBEvent } from "eventsourcingdb";

const USER_INVITED_EVENT_TYPE = "at.overlap.nimbus.user-invited";
const USER_INVITATION_ACCEPTED_EVENT_TYPE =
    "at.overlap.nimbus.user-invitation-accepted";

const usersStore = new Map();

export const projectViews = (
    eventSourcingDBEvent: EventSourcingDBEvent,
) => {
    const event = eventSourcingDBEventToNimbusEvent<Event>(
        eventSourcingDBEvent,
    );

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

The observer automatically tracks its position in the event stream. After each successfully handled event, the `lowerBound` is updated so that reconnections resume from the last processed event rather than replaying the entire stream.

## OpenTelemetry Tracing

Each observed event is processed within an OpenTelemetry span named `eventsourcingdb.observeEvent`. If the event carries a `traceparent` (injected by `writeEvents`), the span is linked to the original writer's trace, enabling end-to-end distributed tracing across the write and read sides.
