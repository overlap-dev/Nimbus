---
description: writeEvents appends Nimbus events to EventSourcingDB with mapping, trace context, and optional preconditions.
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

const writtenEvents = await writeEvents(
    [event],
    [isSubjectPristine(event.subject)]
);
```

## Function Parameters

| Parameter       | Type             | Description                                                      |
| --------------- | ---------------- | ---------------------------------------------------------------- |
| `events`        | `Event[]`        | An array of Nimbus events to write                               |
| `preconditions` | `Precondition[]` | Optional preconditions that must be met for the write to succeed |
| `signal`        | `AbortSignal`    | Optional abort signal to cancel the write (see below)            |

## Return Value

`writeEvents` returns the written EventSourcingDB events (`Event[]` from the `eventsourcingdb` package), including the fields assigned by the server such as `id`, `time` and `hash`. The `id` of the last written event is the new revision of the subject. Hand it back to the client so it can pass it as `expectedRevision` to the next command, which then uses the `isSubjectOnEventId` precondition:

```typescript
const writtenEvents = await writeEvents(events, [
    isSubjectPristine(events[0].subject),
]);

return {
    userId: state.id,
    revision: writtenEvents[writtenEvents.length - 1].id,
};
```

## Preconditions

EventSourcingDB supports the following preconditions. For full details, see the [Using Preconditions](https://docs.eventsourcingdb.io/getting-started/writing-events/#using-preconditions) section in the EventSourcingDB documentation.

To use these preconditions, you can directly import them from the [`EventSourcingDB JavaScript SDK`](https://www.npmjs.com/package/eventsourcingdb).

## Error Handling

`writeEvents` never retries a write on its own and passes the errors of the `eventsourcingdb` SDK through unchanged.

### Violated Preconditions

When the server rejects a write, it throws a `DbApiError`. Its `code` names the error and can be compared with the constants of `ErrorCode`. A violated precondition is reported as `ErrorCode.preconditionViolated`, which is the basis for optimistic concurrency control:

```typescript
import { Exception } from "@nimbus-cqrs/core";
import { writeEvents } from "@nimbus-cqrs/eventsourcingdb";
import { DbApiError, ErrorCode, isSubjectOnEventId } from "eventsourcingdb";

try {
    await writeEvents(events, [
        isSubjectOnEventId(events[0].subject, command.data.expectedRevision),
    ]);
} catch (error) {
    if (
        error instanceof DbApiError &&
        error.code === ErrorCode.preconditionViolated
    ) {
        throw new Exception(
            "CONFLICT",
            "The expected revision does not match the current revision anymore",
            { errorCode: "REVISION_CONFLICT" },
            409
        );
    }

    throw error;
}
```

The same code is reported for EventSourcingDB versions before 1.3, since the SDK maps the HTTP `409` of the v1 API to `ErrorCode.preconditionViolated`.

### Unknown Outcome

EventSourcingDB never stops a write halfway, but the response to a write can get lost, for example when the connection stalls or the request is aborted after it was sent. In this case `writeEvents` throws an `OutcomeUnknownError` whose `cause` holds the original error. The events may have been stored nonetheless, so read the subject back before writing them again:

```typescript
import { OutcomeUnknownError } from "eventsourcingdb";

try {
    await writeEvents(events);
} catch (error) {
    if (error instanceof OutcomeUnknownError) {
        // Find out whether the events were stored, for example by
        // reading the subject, before writing them again.
    }
}
```

### Cancellation

Pass an `AbortSignal` as the third argument to cancel a write. Aborting before the request has been sent throws the abort reason and nothing is written. Aborting once the request has been sent does not undo the write; the call then throws an `OutcomeUnknownError` as described above.

```typescript
const controller = new AbortController();

await writeEvents(events, undefined, controller.signal);
```

## OpenTelemetry Tracing

Every call to `writeEvents` is automatically wrapped in an OpenTelemetry span named `eventsourcingdb.writeEvents`. The current trace context (`traceparent` and `tracestate`) is injected into each event candidate, enabling end-to-end distributed tracing from the event writer to any [event observer](/guide/eventsourcingdb/event-observer) that processes the event.

The following metrics are recorded:

| Metric                                       | Type      | Labels                | Description                             |
| -------------------------------------------- | --------- | --------------------- | --------------------------------------- |
| `eventsourcingdb_operation_total`            | Counter   | `operation`, `status` | Total number of write operations        |
| `eventsourcingdb_operation_duration_seconds` | Histogram | `operation`           | Duration of write operations in seconds |
| `eventsourcingdb_event_size_bytes`           | Histogram | —                     | Size of each written event in bytes     |
