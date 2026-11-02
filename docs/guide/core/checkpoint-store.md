---
description: CheckpointStore is the contract for persisting where event consumers resume; the core ships the types and an in-memory implementation.
prev:
    text: "getEnv"
    link: "/guide/core/get-env"

next:
    text: "Hono"
    link: "/guide/hono"
---

# Checkpoint Store

A **checkpoint** records where one event consumer resumes after a restart. The `CheckpointStore` type is the contract an [event observer](/guide/eventsourcingdb/event-observer) uses to load and persist those checkpoints. The core package defines the types and ships an in-memory implementation. Persistent implementations live in the storage packages, for example the [MongoCheckpointStore](/guide/mongodb/checkpoint-store).

The contract knows nothing about a specific event store. A `position` is an opaque string owned by whoever runs the consumers. For EventSourcingDB it is the id of the last event the consumer finished.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Checkpoint

```typescript
type Checkpoint = {
    consumer: string;
    observer: string;
    position?: string;
    updatedAt: string;
    failure?: {
        position: string;
        error: string;
        at: string;
    };
};
```

| Property    | Description                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `consumer`  | The stable name of the consumer, unique across the whole application. Renaming it replays the stream        |
| `observer`  | The name of the observer the consumer belongs to                                                             |
| `position`  | The last position the consumer finished. Absent until the first one, in which case it starts at the beginning |
| `updatedAt` | When the checkpoint was last written, as ISO 8601                                                            |
| `failure`   | Set while the last attempt at `failure.position` failed. Cleared by the next successful save                 |

A matching Zod schema is exported as `checkpointSchema` for store implementations that want to validate what they read back.

## CheckpointStore

```typescript
type CheckpointStore = {
    load(consumers: readonly string[]): Promise<Map<string, Checkpoint>>;
    save(updates: readonly CheckpointUpdate[]): Promise<void>;
    reset(consumer: string, position?: string): Promise<void>;
};
```

### load

Returns the checkpoints of the given consumers keyed by name. Consumers without a checkpoint are absent from the result and start from the beginning of the stream.

### save

Persists every given `CheckpointUpdate`. Implementations write them in one round trip where the storage allows it, since an observer saves after every event.

```typescript
type CheckpointUpdate = {
    consumer: string;
    observer: string;
    position?: string;
    failure?: {
        position: string;
        error: string;
    };
};
```

- `position` left out keeps the stored position, so a failure can be recorded for a consumer that has not finished any event yet.
- `failure` left out **clears** an existing failure marker. The marker therefore always reflects the most recent attempt.

### reset

Moves a consumer to `position`, or back to the beginning of the stream when `position` is omitted, and clears any failure marker. Use it to rebuild a projection or to skip an event a consumer cannot handle.

This is an **offline operation**. The observer running the consumer must not be active. It keeps its positions in memory and would overwrite the reset with its next save.

## InMemoryCheckpointStore

```typescript
import { InMemoryCheckpointStore } from "@nimbus-cqrs/core";

const checkpointStore = new InMemoryCheckpointStore();
```

Keeps checkpoints in process memory. Every restart starts from an empty store, so consumers replay the whole stream. Use it in tests, or for consumers whose read models live in memory as well and have to be rebuilt on every start anyway.

## Implementing a Store

A store for another database only has to implement the three methods above. Keep these properties:

- Key records by `consumer` alone. Consumer names are unique across the application, and `reset` only receives the consumer name.
- `load` must not fail for unknown consumers. Leave them out of the result.
- `save` is called with several consumers at once. Write them together.
- A save **without** `failure` removes a stored failure marker.
- Treat `position` as an opaque string. Do not parse or compare it.

See the [MongoCheckpointStore](/guide/mongodb/checkpoint-store) for a reference implementation.
