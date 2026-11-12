---
status: accepted
---

# MongoDB as the Read-Model Store

Read models (the CQRS query side) are projected into and served from MongoDB. MongoDB is not the system of record — the EventSourcingDB event log ([ADR-0001](0001-event-sourcing-with-eventsourcingdb.md)) is; read models are derived, disposable projections.

We chose MongoDB because read models are denormalized, document-shaped views with a schema per projection, which maps naturally onto documents, and because Nimbus already provides a MongoDB adapter (`@nimbus-cqrs/mongodb`). Because the data is rebuildable from the event log, lock-in is low.

## Consequences

- **Read models must stay rebuildable from events.** No data may live authoritatively only in MongoDB.
