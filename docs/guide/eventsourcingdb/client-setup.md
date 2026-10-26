---
description: setupEventSourcingDBClient initializes a singleton EventSourcingDB client with connectivity checks and auth.
prev:
    text: "Nimbus EventSourcingDB"
    link: "/guide/eventsourcingdb"

next:
    text: "Write Events"
    link: "/guide/eventsourcingdb/write-events"
---

# Client Setup

The `setupEventSourcingDBClient` function initializes a singleton EventSourcingDB client that is used by all other functions in this package. It verifies connectivity and authenticates with the server before the application starts processing events.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Basic Usage

```typescript
import { setupEventSourcingDBClient } from "@nimbus-cqrs/eventsourcingdb";

await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ""),
    apiToken: process.env.ESDB_API_TOKEN ?? "",
});
```

## Configuration Options

| Option           | Type              | Description                                                                    |
| ---------------- | ----------------- | ------------------------------------------------------------------------------ |
| `url`            | `URL`             | The URL of the EventSourcingDB server                                          |
| `apiToken`       | `string`          | The API token for authenticating with EventSourcingDB                          |
| `stallTimeout`   | `number`          | Optional stall timeout in milliseconds (defaults to `30000`, see below)        |
| `eventObservers` | `EventObserver[]` | Optional array of event observers to start after initialization                |

### Stall Timeout

Every request fails once nothing arrives from the server for the duration of the stall timeout, for example because the server does not respond or a proxy keeps the connection open without passing anything through. Everything that arrives (events, rows, heartbeats) resets the timer, so a healthy long-running stream is never cut off and the time spent handling an event does not count.

A stalled request throws a `ConnectionStalledError` from the `eventsourcingdb` package. For [event observers](/guide/eventsourcingdb/event-observer) this counts as a connection failure and triggers a reconnect.

```typescript
await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ""),
    apiToken: process.env.ESDB_API_TOKEN ?? "",
    stallTimeout: 10_000,
});
```

## Initialization Behavior

When `setupEventSourcingDBClient` is called, it performs the following steps:

1. Creates a new client instance with the provided URL and API token
2. Pings the EventSourcingDB server to verify connectivity
3. Validates the API token
4. Starts any provided event observers in the background

If the connection or authentication fails, a `GenericException` is thrown and the error is logged.

## EventSourcingDB Versions

The `eventsourcingdb` SDK (version 2 and later) talks to both the v2 API of EventSourcingDB 1.3+ and the v1 API of older versions so no extra configuration is required.

::: warning Proxies and load balancers
Against EventSourcingDB 1.3 and later, all read operations (`readEvents`, `observeEvents`, EventQL queries, ...) use the HTTP method `QUERY` instead of `POST`. If a proxy or load balancer sits in front of EventSourcingDB, it has to let `QUERY` requests through. There is no fallback to `POST`.
:::

## Setup with Event Observers

You can provide event observers that will automatically start observing events after the client is initialized:

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

See the [Event Observer](/guide/eventsourcingdb/event-observer) documentation for details on configuring observers.

## Getting the Client

After initialization, use `getEventSourcingDBClient` to access the singleton client instance anywhere in your application:

```typescript
import { getEventSourcingDBClient } from "@nimbus-cqrs/eventsourcingdb";

const client = getEventSourcingDBClient();
```

::: tip
You typically don't need to call `getEventSourcingDBClient` directly. The [`writeEvents`](/guide/eventsourcingdb/write-events) and [`readEvents`](/guide/eventsourcingdb/read-events) functions handle this internally.
:::

## Error Handling

The setup function throws a `GenericException` in two cases:

| Error              | Cause                                        |
| ------------------ | -------------------------------------------- |
| Connection failure | The EventSourcingDB server is unreachable    |
| Invalid API token  | The provided API token could not be verified |

```typescript
import { setupEventSourcingDBClient } from "@nimbus-cqrs/eventsourcingdb";

try {
    await setupEventSourcingDBClient({
        url: new URL(process.env.ESDB_URL ?? ""),
        apiToken: process.env.ESDB_API_TOKEN ?? "",
    });
} catch (error) {
    // GenericException:
    // - "Could not connect to EventSourcingDB"
    // - "Invalid API token. Please check your API token."
}
```
