---
description: MongoCheckpointStore persists event consumer checkpoints in a MongoDB collection.
prev:
    text: "Deploy Collection"
    link: "/guide/mongodb/deploy-collection"
---

# Checkpoint Store

The `MongoCheckpointStore` is a [`CheckpointStore`](/guide/core/checkpoint-store) backed by a MongoDB collection. Pass it to an [event observer](/guide/eventsourcingdb/event-observer) so its consumers resume where they stopped after a restart.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Usage

```typescript
import { getEnv } from '@nimbus-cqrs/core';
import {
    getMongoConnectionManager,
    MONGO_CHECKPOINTS_COLLECTION,
    MongoCheckpointStore,
} from "@nimbus-cqrs/mongodb";

const env = getEnv({ variables: ['MONGO_DB'] });
 
const getCheckpointCollection = () => {
    return getMongoConnectionManager().getCollection(
        env.MONGO_DB,
        MONGO_CHECKPOINTS_COLLECTION.name,
    );
};

export const checkpointStore = new MongoCheckpointStore(getCheckpointCollection);
```

The constructor takes a collection factory, the same shape the [Repository](/guide/mongodb/repository) uses, so the store can share your application's connection setup.

## Collection

`MONGO_CHECKPOINTS_COLLECTION` is a `MongoCollectionDefinition` for the `nimbus_checkpoints` collection with a unique index on `consumer`. Deploy it together with your other collections using [deployMongoCollection](/guide/mongodb/deploy-collection).

::: warning Consumer names are application-wide
The index is on the consumer name alone, not on observer and consumer. Two observers sharing a store therefore must not declare consumers with the same name, or they overwrite each other's checkpoint. Prefix consumer names with their domain or observer (for example `ticketing.tickets`) to keep them unique.
:::

One document is stored per consumer:

```json
{
    "consumer": "ticketing.tickets",
    "observer": "ticketing",
    "position": "1842",
    "updatedAt": { "$date": "2026-10-07T08:39:24.262Z" },
    "failure": {
        "position": "1843",
        "error": "ZodError: Invalid input",
        "at": { "$date": "2026-10-07T08:40:01.010Z" }
    }
}
```

Dates are stored as BSON dates and converted to ISO strings when read. `position` is stored as a string and never interpreted.

## Behaviour

- `load` queries the given consumer names in one `find`.
- `save` issues one unordered `bulkWrite` of upserts. An update without `failure` `$unset`s a stored failure marker.
- `reset` `$set`s the new position or `$unset`s it, and always `$unset`s `failure`. A consumer without a document is left alone.

Checkpoints are written after the consumers have run, not in the same transaction as the read model, so delivery is at-least-once. Consumers that write to MongoDB should apply events idempotently.

## Resetting from the Command Line

Since `reset` has to run while the observer is stopped, a small CLI is the usual way to call it:

```typescript
import { getMongoConnectionManager } from "@nimbus-cqrs/mongodb";
import { checkpointStore } from "./checkpoint-store.ts";
import { initMongoDB } from "./mongodb.ts";

const [consumer, position] = process.argv.slice(2);

try {
    if (consumer === undefined || consumer === '') {
        throw new Error('Usage: reset-checkpoint <consumer> [event-id]');
    }

    await initMongoDB();
    await checkpointStore.reset(consumer, position);

    process.exitCode = 0;
} catch (error) {
    process.exitCode = 1;
} finally {
    await getMongoConnectionManager().close();
}
```

Without a position the consumer replays the subject from the beginning on the next start and with one it resumes after that event.
