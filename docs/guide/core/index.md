---
prev:
    text: "Quickstart"
    link: "/guide/quickstart"

next:
    text: "Commands"
    link: "/guide/core/commands"
---

# Nimbus Core Package

The core package is the foundation of the entire framework. It provides the essential building blocks for building event-driven applications following the CloudEvents specification.

-   JSR: [@nimbus-cqrs/core](https://jsr.io/@nimbus-cqrs/core)
-   npm: [@nimbus-cqrs/core](https://www.npmjs.com/package/@nimbus-cqrs/core)

::: info Example Application
The examples throughout the core documentation reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## What's Included

The core package provides:

-   **[Commands](/guide/core/commands)** - Write operations following the CloudEvents specification
-   **[Queries](/guide/core/queries)** - Read operations for fetching data
-   **[Events](/guide/core/events)** - Domain events for reactive architectures
-   **[Router](/guide/core/router)** - Message routing with validation and tracing
-   **[Event Bus](/guide/core/event-bus)** - Publish/subscribe for in-process events
-   **[Exceptions](/guide/core/exceptions)** - Structured error handling with HTTP status codes
-   **[Logging](/guide/core/logging)** - Structured logging with configurable formatters
-   **[Observability](/guide/core/observability)** - Built-in logging, tracing, and metrics using OpenTelemetry

## Installation

### Deno

```bash
deno add jsr:@nimbus-cqrs/core
```

### NPM

```bash
npm install @nimbus-cqrs/core
```

### Bun

```bash
bun add @nimbus-cqrs/core
```
