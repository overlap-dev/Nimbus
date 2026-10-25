---
status: accepted
---

# Nimbus as the Backend Framework

The backend is built on Nimbus (`@nimbus-cqrs/*`), a CQRS/Event-Sourcing framework following a Pure Core / Imperative Shell structure.

We chose Nimbus because it encodes the CQRS + Event Sourcing conventions this project is built around, integrates natively with EventSourcingDB [ADR-0001](0001-event-sourcing-with-eventsourcingdb.md) and MongoDB [ADR-0002](0002-mongodb-as-read-model-store.md), and aligns the codebase directly with the ESDM domain model. Nimbus is open source (Apache 2.0), so building on it carries no more lock-in than adopting any open-source framework such as Nest.js. Any other developer or agency can continue with it.
