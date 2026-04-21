---
prev:
    text: "onError Handler"
    link: "/guide/hono/on-error"

next:
    text: "Client Setup"
    link: "/guide/eventsourcingdb/client-setup"
---

# Nimbus EventSourcingDB Package

The EventSourcingDB package provides a seamless integration between Nimbus and [EventSourcingDB](https://www.eventsourcingdb.io/). It offers a managed client, event reading and writing with automatic Nimbus event mapping, event observers with retry logic, and built-in OpenTelemetry tracing.

-   JSR: [@nimbus/eventsourcingdb](https://jsr.io/@nimbus/eventsourcingdb)
-   npm: [@nimbus-cqrs/eventsourcingdb](https://www.npmjs.com/package/@nimbus-cqrs/eventsourcingdb)

### Deno

```bash
deno add jsr:@nimbus/eventsourcingdb
```

### NPM

```bash
npm install @nimbus-cqrs/eventsourcingdb
```

### Bun

```bash
bun add @nimbus-cqrs/eventsourcingdb
```
