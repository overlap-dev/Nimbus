---
description: Hub for @nimbus-cqrs/eventsourcingdb — client setup, read/write events, observers, and Nimbus event mapping.
prev:
    text: "onError Handler"
    link: "/guide/hono/on-error"

next:
    text: "Client Setup"
    link: "/guide/eventsourcingdb/client-setup"
---

# Nimbus EventSourcingDB Package

The EventSourcingDB package provides a seamless integration between Nimbus and [EventSourcingDB](https://www.eventsourcingdb.io/). It offers a managed client, event reading and writing with automatic Nimbus event mapping, event observers with retry logic, and built-in OpenTelemetry tracing.

-   npm: [@nimbus-cqrs/eventsourcingdb](https://www.npmjs.com/package/@nimbus-cqrs/eventsourcingdb)

The package requires the official [`eventsourcingdb`](https://www.npmjs.com/package/eventsourcingdb) SDK (version 2 or later) as a peer dependency. The SDK works with EventSourcingDB 1.3+ (v2 API) as well as older versions (v1 API) and detects the API at runtime. See [Client Setup](/guide/eventsourcingdb/client-setup#eventsourcingdb-versions) for details.

::: warning Upgrading from the `eventsourcingdb` 1.x SDK
If you upgrade an existing application, read the [SDK migration guide](https://github.com/thenativeweb/eventsourcingdb-client-javascript#upgrading-from-version-1).  
For Nimbus users the relevant changes are the following. 
:::

-   Server errors are `DbApiError` instances with a `code`. Replace checks like `error.message.includes("409")` with `error instanceof DbApiError && error.code === ErrorCode.preconditionViolated` (see [Write Events](/guide/eventsourcingdb/write-events#error-handling)).
-   Writes whose outcome is unknown throw an `OutcomeUnknownError` whose `cause` is the original error.
-   Observers no longer end quietly when the server closes the stream; Nimbus reconnects according to `connectionRetryOptions` (see [Event Observer](/guide/eventsourcingdb/event-observer#retry-options)).
-   Proxies in front of EventSourcingDB 1.3+ must allow the HTTP method `QUERY`.
-   `writeEvents` now returns the written events instead of `void`.


### npm

```bash
npm install @nimbus-cqrs/eventsourcingdb
```

### pnpm

```bash
pnpm add @nimbus-cqrs/eventsourcingdb
```

### Bun

```bash
bun add @nimbus-cqrs/eventsourcingdb
```

### Deno

```bash
deno add npm:@nimbus-cqrs/eventsourcingdb
```

## Example Application

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::
