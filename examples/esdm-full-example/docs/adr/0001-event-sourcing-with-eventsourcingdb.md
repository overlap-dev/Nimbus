---
status: accepted
---

# Event Sourcing with EventSourcingDB

The write side is event-sourced, with EventSourcingDB as the event store. Read models are eventually consistent projections.

We chose Event Sourcing because the domain is modeled event-first and its value lies in the history of operational facts (audit trail, temporal queries, reconstructable state) rather than in current state alone. We chose EventSourcingDB as the store because it is purpose-built for event sourcing and Nimbus (Overlap backend framework) already supports it. We accept product lock-in in exchange.

## Considered Options

- **Mutable CRUD state store** — rejected: discards the history the domain cares about.
- **DIY Postgres/Mongo event table** — rejected: reinvents concurrency, subscriptions, and stream semantics.
- **General-purpose message bus / Kafka** — rejected: not an event store; retention and write-side consistency are the wrong fit.
- **EventStoreDB** — rejected: Nimbus already targets EventSourcingDB.

## Consequences

- **GDPR erasure** — an append-only log complicates the right to erasure. Keeping PII out of events (crypto-shredding, referencing IDs only) is a deliberate design constraint.
- **Eventual consistency** — reads come from projected read models and lag the write side.
- **Projection rebuild discipline** — read models must be rebuildable from the log, making event versioning a first-class concern.
