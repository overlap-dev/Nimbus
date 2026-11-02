---
description: An event observer watches one subject and feeds every event to its consumers (projections, policies, process managers, etc.) each resuming from its own checkpoint.
prev:
    text: "Read Events"
    link: "/guide/eventsourcingdb/read-events"

next:
    text: "Event Mapping"
    link: "/guide/eventsourcingdb/event-mapping"
---

# Event Observer

An **event observer** is a background loop that watches one EventSourcingDB subject and hands every event to its **event consumers**. On startup it replays the events the consumers have not seen yet, then stays live for new ones. Observers reconnect with exponential backoff when the stream fails and retry consumer failures in place without tearing down the stream.

A consumer is one named position in the stream. A read-model projection, a policy, an event handler and a process manager all have that shape and only what they do with the event differs. Each consumer owns a **checkpoint** in a [checkpoint store](/guide/core/checkpoint-store), so one of them can be rebuilt or halted without moving the others.

For the underlying mechanics see the [Observing Events](https://docs.eventsourcingdb.io/getting-started/observing-events/) section in the EventSourcingDB documentation.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

Event observers are typically configured as part of the [client setup](/guide/eventsourcingdb/client-setup):

```typescript
import { InMemoryCheckpointStore } from "@nimbus-cqrs/core";
import {
    type EventConsumer,
    setupEventSourcingDBClient,
} from "@nimbus-cqrs/eventsourcingdb";

const usersProjection: EventConsumer = {
    name: "iam.users",
    handles: (event) => event.type.startsWith("at.overlap.nimbus.user-"),
    handle: async (event) => {
        // load the document, fold the event in, save it
    },
};

await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ""),
    apiToken: process.env.ESDB_API_TOKEN ?? "",
    eventObservers: [
        {
            name: "iam",
            subject: "/users",
            recursive: true,
            checkpointStore: new InMemoryCheckpointStore(),
            consumers: [usersProjection],
        },
    ],
});
```

You can also start an observer independently after the client has been initialized. `initEventObserver` resolves once the observer has loaded its checkpoints and started the loop, not once it has caught up:

```typescript
import { initEventObserver } from "@nimbus-cqrs/eventsourcingdb";

const observer = await initEventObserver({
    name: "iam",
    subject: "/users",
    recursive: true,
    checkpointStore,
    consumers: [usersProjection],
});

observer.status().phase; // "catching-up" | "live" | "stopped"
```

Use the `InMemoryCheckpointStore` for tests and for consumers that rebuild their state on every start anyway. For anything that has to survive a restart use a persistent store such as the [MongoCheckpointStore](/guide/mongodb/checkpoint-store).

## EventObserver Options

| Option                   | Type              | Default      | Description                                                        |
| ------------------------ | ----------------- | ------------ | ------------------------------------------------------------------ |
| `name`                   | `string`          | _(required)_ | Unique name; stored on every checkpoint and used for lookup        |
| `subject`                | `string`          | _(required)_ | The subject to observe events for                                  |
| `recursive`              | `boolean`         | `false`      | Whether to observe events recursively for all sub-subjects         |
| `consumers`              | `EventConsumer[]` | _(required)_ | The consumers, run in declaration order for every event            |
| `checkpointStore`        | `CheckpointStore` | _(required)_ | Where the consumers' checkpoints are persisted                     |
| `connectionRetryOptions` | `RetryOptions`    | see below    | Retry options when the observe stream / connection fails           |
| `handlerRetryOptions`    | `RetryOptions`    | see below    | Retry options when a consumer throws (in-place, no reconnect)      |

## Event Consumers

```typescript
import type { Event } from "@nimbus-cqrs/core";
import type { EventConsumer } from "@nimbus-cqrs/eventsourcingdb";
import type { Event as EventSourcingDBEvent } from "eventsourcingdb";

export const notifyAssignee: EventConsumer = {
    name: "ticketing.ticket.notify-assignee",
    dependsOn: ["ticketing.tickets"],
    handles: (event: Event) => event.type === TICKET_ASSIGNED_EVENT_TYPE,
    handle: async (event: Event, raw: EventSourcingDBEvent) => {
        // ...
    },
};
```

| Property    | Type                                                      | Description                                                                                       |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `name`      | `string`                                                  | The checkpoint key. Has to stay stable: renaming a consumer replays the subject from the beginning |
| `handles`   | `(event: Event) => boolean`                               | Whether the consumer handles this event. Unhandled events still advance the checkpoint            |
| `handle`    | `(event: Event, raw: EventSourcingDBEvent) => Promise<void>` | Handles one event. Receives the mapped Nimbus event and the original EventSourcingDB event      |
| `dependsOn` | `string[]`                                                | Names of consumers on the same observer this one reads from. They have to be declared before it   |

### How consumers share the stream

- The observer resumes from the **lowest** checkpoint of its consumers. Consumers that are already further ahead skip the replayed events in memory.
- For every event the consumers run **sequentially in declaration order**. A consumer that reads another consumer's read model is declared after it and lists it in `dependsOn`.
- Every consumer advances its checkpoint on every event, handled or not, so a restart resumes exactly where it stopped.
- Checkpoints are written after the consumers have run, so delivery is **at-least-once**. Consumers with side effects (mails, commands) have to be idempotent.

### Failures

A consumer that throws **holds its position** while its siblings advance. The observer retries the event in place according to `handlerRetryOptions`. On the next retry the consumers that already finished the event skip it, so only the failing ones run again.

Once the retries are exhausted the failing consumers are **halted**. They are skipped for the rest of the process lifetime, a critical log entry is written, and the checkpoint keeps the last event they finished together with a `failure` marker (`position`, `error`, `at`). A restart resumes at the event they could not handle. The observer itself moves on so the other consumers keep up.

Consumers that `dependsOn` a failing consumer hold their position as well, and are halted together with it. That way a notification is never checkpointed past an event the projection it reads has not applied.

If the failure happens outside a consumer (while mapping the event or writing checkpoints) the whole observer is in an unknown state and every consumer is halted.

## Retry Options

`connectionRetryOptions` and `handlerRetryOptions` share the same shape (defaults apply independently to each):

| Option                | Type     | Default | Description                                          |
| --------------------- | -------- | ------- | ---------------------------------------------------- |
| `maxRetries`          | `number` | `3`     | Maximum number of retries after the initial attempt  |
| `initialRetryDelayMs` | `number` | `3000`  | Initial delay in milliseconds before the first retry |

Both paths use **exponential backoff with jitter** (via the shared [`withRetry`](/guide/core/with-retry) / `calculateBackoffDelay` helpers from `@nimbus-cqrs/core`):

- Base delay doubles with each attempt: `initialDelayMs * 2^attempt`
- Random jitter of 0-30% is added to avoid thundering-herd effects

**Connection retries** (`connectionRetryOptions`):

- Used when the observe stream fails or disconnects
- Observing never ends on its own. A stream that the server closes (for example during a restart or a rollback) or that stalls (see [stall timeout](/guide/eventsourcingdb/client-setup#stall-timeout)) counts as a connection failure and triggers a reconnect
- After the initial attempt plus `maxRetries` reconnect attempts fail, a critical error is logged and the observer stops (`maxRetries + 1` failed attempts total). Its phase becomes `stopped` and its health check reports `error`
- The connection retry counter resets when events start flowing again

::: tip Sizing connection retries
Since every server-side stream close triggers a reconnect, size `connectionRetryOptions` for the longest outage you want an observer to survive, for example a rolling restart or a backup window of your EventSourcingDB deployment. With the defaults (`maxRetries: 3`, `initialRetryDelayMs: 3000`) an observer gives up after roughly 20 seconds of consecutive failures.
:::

**Handler retries** (`handlerRetryOptions`):

- Used when a consumer throws. Retries happen in-place without reconnecting
- After the initial attempt plus `maxRetries` retries fail for an event, the failing consumers are halted (`maxRetries + 1` failed attempts total)
- The observer then continues with the next event for the remaining consumers

```typescript
await initEventObserver({
    name: "iam",
    subject: "/users",
    recursive: true,
    checkpointStore,
    consumers: [usersProjection],
    connectionRetryOptions: {
        maxRetries: 5,
        initialRetryDelayMs: 1000,
    },
    handlerRetryOptions: {
        maxRetries: 3,
        initialRetryDelayMs: 500,
    },
});
```

## Status and Health

Every started observer is registered under its name. `getEventObserver(name)` returns the handle of one observer, `listEventObservers()` all of them in start order.

```typescript
import {
    getEventObserver,
    listEventObservers,
} from "@nimbus-cqrs/eventsourcingdb";

const status = getEventObserver("iam").status();
// {
//     name: "iam",
//     subject: "/users",
//     phase: "live",
//     consumers: [
//         { name: "iam.users", position: "1842", halted: false },
//     ],
// }

const unhealthy = listEventObservers()
    .map((observer) => observer.healthCheck())
    .filter((health) => health.status !== "healthy");
```

| Phase         | Meaning                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `catching-up` | Replaying events that were already stored when the observer started             |
| `live`        | Every event stored at startup has been processed, new events arrive as written  |
| `stopped`     | Connection retries are exhausted and the observer gave up                       |

`healthCheck()` returns `{ status: "error", details }` when the observer stopped or any consumer is halted, and `{ status: "healthy" }` otherwise. An observer that is still catching up is healthy. Wire it into your readiness or health endpoint next to the database checks. A halted projection leaves MongoDB and EventSourcingDB perfectly reachable, so those checks alone would stay green.

Each consumer status carries its `position` (the id of the last event it finished, `null` before the first), whether it is `halted`, and the most recent `failure` if any (including one loaded from the checkpoint store at startup), so a consumer that failed in the previous run is visible until it succeeds again.

## Rebuilding a Consumer

To replay a consumer from the beginning or move it to a specific event, reset its checkpoint with [`checkpointStore.reset(consumer, position?)`](/guide/core/checkpoint-store#reset) while the observer is **not running**. A running observer keeps its positions in memory and would overwrite the reset with its next checkpoint. On the next start the observer resumes from the new lowest checkpoint and consumers that are further ahead skip the replayed events.

## OpenTelemetry Tracing

Each observed event is processed within an OpenTelemetry consumer span named `eventsourcingdb.observeEvent`. If the event carries a `traceparent` (injected by `writeEvents`), the span is linked to the original writer's trace, enabling end-to-end distributed tracing across the write and read sides.

**Span attributes** (include identifying CloudEvents fields):

- `cloudevents.event_id`
- `cloudevents.event_type`
- `cloudevents.event_subject`
- `eventsourcingdb.observer.subject`
- Handler retries add a `retry` span event (`attempt`, `delay_ms`)

**Metrics** (labels use `subject` + `event_type` where an event is in scope; connection metrics use `subject` only — no `event_id` on metric labels):

| Metric                                                     | Type      | Labels                            | Description                                                          |
| ---------------------------------------------------------- | --------- | --------------------------------- | -------------------------------------------------------------------- |
| `eventsourcingdb_observer_events_handled_total`            | Counter   | `subject`, `event_type`, `status` | Events handled (`success`) or given up on after exhaustion (`skipped`) |
| `eventsourcingdb_observer_handling_duration_seconds`       | Histogram | `subject`, `event_type`           | Handler duration in seconds (includes retries)                       |
| `eventsourcingdb_observer_handler_retry_attempts_total`    | Counter   | `subject`, `event_type`           | In-place handler retry attempts                                      |
| `eventsourcingdb_observer_connection_retry_attempts_total` | Counter   | `subject`                         | Stream failures that schedule a reconnect                            |
| `eventsourcingdb_observer_connection_reconnects_total`     | Counter   | `subject`                         | Successful reconnects (counted when events flow again after retries) |

Replays are summarized in one debug log line per contiguous burst of events (count, duration, events per second, first and last event id) instead of one line per event.
