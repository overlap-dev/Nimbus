<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus EventSourcingDB

Integration between Nimbus and [EventSourcingDB](https://www.eventsourcingdb.io/). The package wraps the official `eventsourcingdb` client with:
- a **singleton setup** that pings the server, verifies the API token and registers long-running observers in one call,
- typed **`writeEvents` / `readEvents`** helpers that translate between Nimbus events and EventSourcingDB events while preserving correlation IDs, data schemas and W3C trace context (`traceparent` / `tracestate`),
- resilient **event observers** with exponential-backoff retries, jitter, position tracking across reconnects and OpenTelemetry span linking back to the original writer.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

Also refer to the [EventSourcingDB documentation](https://docs.eventsourcingdb.io/) directly for more information about the EventSourcingDB features.

## Install

```bash
# npm
npm install @nimbus-cqrs/eventsourcingdb

# pnpm
pnpm add @nimbus-cqrs/eventsourcingdb

# Bun
bun add @nimbus-cqrs/eventsourcingdb

# Deno
deno add npm:@nimbus-cqrs/eventsourcingdb
```

`eventsourcingdb` (version 2 or later) is a peer dependency — install it alongside this package. The SDK talks to both the v2 API of EventSourcingDB 1.3+ and the v1 API of older versions and picks the right one at runtime.

## Upgrading from `eventsourcingdb` 1.x

If you upgrade an existing application from the 1.x SDK, see the [SDK migration guide](https://github.com/thenativeweb/eventsourcingdb-client-javascript#upgrading-from-version-1). The points that matter for Nimbus users:
- **Server errors** are `DbApiError` instances with a `code`. Replace checks like `error.message.includes("409")` with `error instanceof DbApiError && error.code === ErrorCode.preconditionViolated`.
- **Failed writes** whose outcome is unknown (stalled connection, abort after sending) throw an `OutcomeUnknownError` whose `cause` is the original error.
- **Observers** no longer end quietly when the server closes the stream. Nimbus treats this as a connection failure and reconnects according to `connectionRetryOptions`.
- **Proxies** in front of EventSourcingDB 1.3+ must allow the HTTP method `QUERY`, which the SDK uses for all reads.
- **`writeEvents`** now returns the written events instead of `void`.

# Examples

For detailed documentation, please refer to the [Nimbus documentation](https://nimbus.overlap.at).

The snippets below use a tiny `Todo` domain to walk through the package — events live under the `/todos` subject and we react to `com.example.todo.added` events.

## Quick start

A typical wiring at application startup: configure the client, register the observers you want to keep running, then write events from your command handlers.

```typescript
import { createEvent } from '@nimbus-cqrs/core';
import {
    eventSourcingDBEventToNimbusEvent,
    setupEventSourcingDBClient,
    writeEvents,
} from '@nimbus-cqrs/eventsourcingdb';

await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ''),
    apiToken: process.env.ESDB_API_TOKEN ?? '',
    eventObservers: [
        {
            subject: '/todos',
            recursive: true,
            eventHandler: async (event) => {
                const nimbusEvent = eventSourcingDBEventToNimbusEvent(event);
                console.log('reacting to', nimbusEvent.type, nimbusEvent.data);
            },
        },
    ],
});

await writeEvents([
    createEvent({
        type: 'com.example.todo.added',
        source: 'https://app.example.com',
        subject: '/todos/todo-1',
        data: { id: 'todo-1', title: 'Write the README' },
    }),
]);
```

## setupEventSourcingDBClient

`setupEventSourcingDBClient` builds the singleton client. It pings the server and verifies the API token at startup, so misconfiguration fails loudly before any business code runs. Anywhere later in the app you can grab the underlying client through `getEventSourcingDBClient()` if you need to call the raw driver.

```typescript
import {
    getEventSourcingDBClient,
    setupEventSourcingDBClient,
} from '@nimbus-cqrs/eventsourcingdb';

await setupEventSourcingDBClient({
    url: new URL(process.env.ESDB_URL ?? ''),
    apiToken: process.env.ESDB_API_TOKEN ?? '',
    // Optional: fail a request once nothing arrives for 10 s (default 30 s).
    stallTimeout: 10_000,
});

// Anywhere else:
const client = getEventSourcingDBClient();
```

The `eventObservers` array is optional; passing observers here is just a convenience that calls `initEventObserver` for each entry once the client is ready.

`stallTimeout` is optional as well. A request that receives nothing from the server for that long throws a `ConnectionStalledError`. Every event, row or heartbeat that arrives resets the timer, so healthy long-running streams are never cut off.

## writeEvents

`writeEvents` takes an array of Nimbus events and persists them to EventSourcingDB. Before writing it wraps each event payload with Nimbus metadata (`payload` + `nimbusMeta`) so the correlation ID and optional `dataschema` survive a round-trip, and it injects the active OpenTelemetry context as `traceparent` / `tracestate` so distributed traces stitch together end-to-end.

```typescript
import { createEvent } from '@nimbus-cqrs/core';
import { writeEvents } from '@nimbus-cqrs/eventsourcingdb';

await writeEvents([
    createEvent({
        type: 'com.example.todo.added',
        source: 'https://app.example.com',
        subject: '/todos/todo-1',
        data: { id: 'todo-1', title: 'Write the README' },
    }),
]);
```

`writeEvents` returns the written EventSourcingDB events including the server-assigned fields (`id`, `time`, `hash`, ...). The `id` of the last written event is the new revision of the subject. This is useful for subsequent writes to the same subject or to hand it back to the client.

The second argument accepts EventSourcingDB [preconditions](https://docs.eventsourcingdb.io/getting-started/writing-events/#using-preconditions) which are useful for optimistic concurrency, e.g. only appending an event when the subject has no events yet:

```typescript
import { isSubjectPristine } from 'eventsourcingdb';

const writtenEvents = await writeEvents(
    [todoAddedEvent],
    [isSubjectPristine('/todos/todo-1')],
);

const revision = writtenEvents[writtenEvents.length - 1].id;
```

A violated precondition surfaces as a `DbApiError` with the code `ErrorCode.preconditionViolated`. A write whose outcome is unknown (e.g. the connection stalled after the request was sent) throws an `OutcomeUnknownError`. Better replay the subject's stream before writing again. An optional `AbortSignal` can be passed as the third argument.

```typescript
import { DbApiError, ErrorCode, isSubjectOnEventId } from 'eventsourcingdb';

try {
    await writeEvents(
        [todoRenamedEvent],
        [isSubjectOnEventId('/todos/todo-1', expectedRevision)],
    );
} catch (error) {
    if (
        error instanceof DbApiError &&
        error.code === ErrorCode.preconditionViolated
    ) {
        // Somebody else modified the todo in the meantime.
    }
    throw error;
}
```

## readEvents

`readEvents` returns an async generator that yields raw EventSourcingDB events for a subject. Use `eventSourcingDBEventToNimbusEvent` to lift each event back into a typed Nimbus event when you want to feed it into your domain.

```typescript
import {
    eventSourcingDBEventToNimbusEvent,
    readEvents,
} from '@nimbus-cqrs/eventsourcingdb';

for await (const event of readEvents('/todos/todo-1', { recursive: false })) {
    const nimbusEvent = eventSourcingDBEventToNimbusEvent(event);
    // ...rebuild your aggregate, replay state, etc.
}
```

Pass an `AbortSignal` as the third argument if you need to cancel a long-running read.

## Event observers

An `EventObserver` is a long-running consumer attached to a subject. `initEventObserver` (or the `eventObservers` array on `setupEventSourcingDBClient`) starts it in the background and keeps it alive. Connection and handler failures are retried separately with exponential backoff plus jitter (defaults: 3 retries, 3000 ms initial delay for each):
- **Connection failures** reconnect the observe stream (`connectionRetryOptions`; deprecated alias: `retryOptions`). Observing never ends on its own. A stream closed by the server (e.g. during a restart) or a stalled connection counts as a connection failure, so size the retries for the longest outage an observer should survive.
- **Handler failures** are retried in-place without reconnecting (`handlerRetryOptions`). After handler retries are exhausted the event is skipped (optional `onHandlerError`) and observation continues.

On every handled or skipped event the observer advances its lower bound so a reconnection resumes from exactly where it left off — no replays, no gaps.

Each event handler runs inside an OpenTelemetry span. If the source event carries a `traceparent`, that span is linked back to the writer's trace, giving you end-to-end visibility from the command that produced the event to every subscriber that reacted to it.

```typescript
import { getLogger } from '@nimbus-cqrs/core';
import { initEventObserver } from '@nimbus-cqrs/eventsourcingdb';

initEventObserver({
    subject: '/todos',
    recursive: true,
    fromLatestEvent: {
        subject: '/todos',
        type: 'com.example.todo.added',
        ifEventIsMissing: 'read-everything',
    },
    eventHandler: async (event) => {
        if (event.type === 'com.example.todo.added') {
            // ...update a read model, send a notification, ...
        }
    },
    connectionRetryOptions: {
        maxRetries: 5,
        initialRetryDelayMs: 1000,
    },
    handlerRetryOptions: {
        maxRetries: 3,
        initialRetryDelayMs: 1000,
    },
    onHandlerError: (error, event) => {
        getLogger().error({
            category: 'EventObserver',
            message: `Skipping event after handler retries: ${event.id}`,
            error,
        });
    },
});
```

Use `lowerBound` to resume from a known event ID, or `fromLatestEvent` to start at the most recent matching event (with a fallback policy when no such event exists yet).

## Event mapping

Every event written by `writeEvents` is wrapped in this shape:

```ts
type EventData = {
    payload: Record<string, unknown>;
    nimbusMeta: {
        correlationid: string;
        dataschema?: string;
    };
};
```

That wrapping is what allows `eventSourcingDBEventToNimbusEvent` to recover a fully-formed Nimbus event later — including the original correlation ID — instead of just the raw payload. If you read events that were _not_ written through Nimbus (e.g. from another system writing to the same store), the helper falls back to treating the entire `data` field as the payload and assigns a fresh correlation ID.

The package exposes the building blocks directly so you can opt out of the helpers when you need to:

```typescript
import {
    eventSourcingDBEventToNimbusEvent,
    isEventData,
    nimbusEventToEventSourcingDBEventCandidate,
} from '@nimbus-cqrs/eventsourcingdb';
```

- `nimbusEventToEventSourcingDBEventCandidate(event)` — manual conversion, e.g. when batching with the raw client.
- `eventSourcingDBEventToNimbusEvent<TEvent>(event)` — typed conversion when reading or observing.
- `isEventData(value)` — type guard to detect the Nimbus envelope on arbitrary stored data.

# License

Copyright 2024-present Overlap GmbH & Co KG (https://overlap.at)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
