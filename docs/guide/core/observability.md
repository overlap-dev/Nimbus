---
description: Built-in logging, tracing, and metrics via OpenTelemetry with zero boilerplate on routers, handlers, and messages.
---

# Observability

Observability is a first-class citizen in Nimbus. The framework is designed so that developers can focus on business logic without implementing logging, tracing, and metrics from the ground up.

Every core component - from message routing to event handling - comes with automatic instrumentation. This means:

- **Zero boilerplate** - Tracing spans and metrics are created automatically
- **Consistent structure** - All logs follow the same format across your application
- **Correlation built-in** - Every message carries a correlation ID for distributed tracing

The three pillars of observability in Nimbus:

1. **Logging** - Structured console output with configurable formatters
2. **Tracing** - Distributed traces via OpenTelemetry spans
3. **Metrics** - Counters and histograms for monitoring

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## OpenTelemetry Standards

Nimbus uses the [OpenTelemetry API](https://opentelemetry.io/) (`@opentelemetry/api`) for all observability instrumentation. This provides:

- **Vendor-agnostic** - Export to any OTLP-compatible backend (Jaeger, Zipkin, Grafana, Honeycomb, Datadog, etc.)
- **Industry standard** - Wide ecosystem support and community adoption
- **Future-proof** - Backed by CNCF with active development

## Enabling OpenTelemetry

Nimbus only depends on the OpenTelemetry *API*. Nothing is exported until your application registers an OpenTelemetry SDK, which is runtime specific.

### Node.js

Install the Node SDK and start it before any application code runs. The simplest way is a small bootstrap module that is loaded with `node --import`:

```bash
npm install @opentelemetry/sdk-node
```

```typescript
// src/otel.ts
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK();
sdk.start();

export const shutdownTelemetry = () => sdk.shutdown();
```

Await `shutdownTelemetry()` as the last step of your graceful shutdown, after the HTTP server and database connections have been drained and before calling `process.exit()`. Shutting the SDK down earlier (for example directly from a signal handler) drops the spans of requests that finish during draining, and exiting without awaiting it can cut off the final export.

```typescript
// src/main.ts
import { shutdownTelemetry } from "./otel.ts";

const shutdown = async () => {
    await server.shutdown();
    await getMongoConnectionManager("default").close();
    await shutdownTelemetry();
    process.exit(0);
};
```

The SDK is configured through the standard `OTEL_*` environment variables:

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-otlp-endpoint.com/otlp"
export OTEL_SERVICE_NAME=your-service-name
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production

node --import ./src/otel.ts src/main.ts
```

All traces and metrics from Nimbus will be exported to your configured backend. See `examples/eventsourcing-demo/src/otel.ts` in the repository for a complete example. It registers the shutdown through a small `telemetry.ts` module so the application can also be started without the bootstrap.

### Deno

Deno ships a built-in OpenTelemetry SDK, so no additional dependency is needed. Set `OTEL_DENO=true` together with the same `OTEL_*` variables as above and run your application with `deno run -A src/main.ts`. See [Deno's OpenTelemetry documentation](https://docs.deno.com/runtime/fundamentals/open_telemetry/) for details.

## Built-in Instrumentation

### MessageRouter

The [MessageRouter](/guide/core/router) automatically creates spans for every routed message:

**Tracing:**

- Span name: `router.route`
- Attributes: `messaging.system`, `messaging.router_name`, `messaging.destination`, `correlation_id`

**Metrics:**

- `router_messages_routed_total` - Counter for total messages routed (with `status: success|error`)
- `router_routing_duration_seconds` - Histogram of routing duration

### EventBus

The [NimbusEventBus](/guide/core/event-bus) instruments both publishing and handling:

**Tracing:**

- `eventbus.publish` span for event publishing
- `eventbus.handle` span for event handling with retry tracking

**Metrics:**

- `eventbus_events_published_total` - Counter for published events
- `eventbus_events_delivered_total` - Counter for delivered events (with `status: success|error`)
- `eventbus_event_handling_duration_seconds` - Histogram of handler execution time
- `eventbus_retry_attempts_total` - Counter for retry attempts
- `eventbus_event_size_bytes` - Histogram of event sizes

### EventSourcingDB

The [EventSourcingDB package](/guide/eventsourcingdb/) instruments writes, reads, and observers:

**Tracing:**

- `eventsourcingdb.writeEvents` / `eventsourcingdb.readEvents` client spans
- `eventsourcingdb.observeEvent` consumer span per observed event (with id/type/subject attributes and handler `retry` events)

**Metrics:**

- `eventsourcingdb_operation_total` - Counter for read/write operations (with `status: success|error`)
- `eventsourcingdb_operation_duration_seconds` - Histogram of operation duration
- `eventsourcingdb_event_size_bytes` - Histogram of written event sizes (no labels)
- `eventsourcingdb_observer_events_handled_total` - Counter for handled events (`status: success|skipped`)
- `eventsourcingdb_observer_handling_duration_seconds` - Histogram of observer handler duration
- `eventsourcingdb_observer_handler_retry_attempts_total` - Counter for handler retries
- `eventsourcingdb_observer_connection_retry_attempts_total` - Counter for scheduled reconnects
- `eventsourcingdb_observer_connection_reconnects_total` - Counter for successful reconnects (when events flow again)

See [Event Observer](/guide/eventsourcingdb/event-observer) and [Write Events](/guide/eventsourcingdb/write-events) for details.

### Logger

The [Logger](/guide/core/logging) outputs structured logs to the console. Runtimes that capture `console` output for OpenTelemetry (such as Deno's built-in SDK) export these logs alongside traces and metrics; on Node.js, forward stdout to your log collector or add a `console` instrumentation to the Node SDK.

## Custom Tracing with withSpan()

For business logic that needs custom tracing, use the `withSpan()` higher-order function:

```typescript
import { withSpan } from "@nimbus-cqrs/core";

const fetchUser = withSpan(
    {
        name: "fetchUser",
        attributes: {
            "user.source": "database",
        },
    },
    async (userId: string) => {
        return await db.users.findById(userId);
    },
);

// Usage - automatically traced
const user = await fetchUser("123");
```

### Adding Dynamic Attributes

Access the span within your function to add attributes based on runtime data:

```typescript
import { withSpan } from "@nimbus-cqrs/core";
import { Span } from "@opentelemetry/api";

const processOrder = withSpan(
    { name: "processOrder" },
    async (orderId: string, span: Span) => {
        const order = await db.orders.findById(orderId);

        // Add attributes based on the order
        span.setAttribute("order.total", order.total);
        span.setAttribute("order.items", order.items.length);

        return await processPayment(order);
    },
);
```

### Options

| Option       | Type         | Description                                |
| ------------ | ------------ | ------------------------------------------ |
| `name`       | `string`     | The span name displayed in your tracing UI |
| `tracerName` | `string`     | Tracer name (defaults to `"nimbus"`)       |
| `kind`       | `SpanKind`   | Span kind (defaults to `INTERNAL`)         |
| `attributes` | `Attributes` | Initial attributes to set on the span      |

## Correlation IDs

All messages in Nimbus (Commands, Queries, Events) carry a `correlationid` field. This enables:

- **Request tracing** - Follow a request through commands, events, and queries
- **Log correlation** - Group related logs together
- **Distributed tracing** - Track requests across services

The correlation ID is automatically:

- Generated when creating messages with `createCommand()`, `createQuery()`, or `createEvent()`
- Propagated from commands to events they produce
- Included in log output when provided
- Added as a span attribute for tracing

```typescript
// Correlation ID is passed from command to event
const command = createCommand<InviteUserCommand>({
    type: INVITE_USER_COMMAND_TYPE,
    source: "nimbus.overlap.at",
    correlationid: getCorrelationId(c), // From HTTP request
    data: body,
});

// In the handler, create event with same correlation ID
const event = createEvent<UserInvitedEvent>({
    type: USER_INVITED_EVENT_TYPE,
    source: "nimbus.overlap.at",
    correlationid: command.correlationid, // Propagate
    data: state,
});
```

## Best Practices

### Use Structured Logging

Always use the structured logger instead of `console.log`:

```typescript
import { getLogger } from "@nimbus-cqrs/core";

// Good - structured and traceable
getLogger().info({
    message: "User created",
    category: "Users",
    data: { userId: user.id },
    correlationId: command.correlationid,
});

// Avoid - unstructured
console.log("User created:", user.id);
```

### Propagate Correlation IDs

Always pass correlation IDs when creating events from commands:

```typescript
const event = createEvent<UserInvitedEvent>({
    type: USER_INVITED_EVENT_TYPE,
    source: "nimbus.overlap.at",
    correlationid: command.correlationid, // Always propagate
    data: state,
});
```

### Use withSpan for Important Operations

Wrap critical business logic with `withSpan()` for visibility:

```typescript
const validatePayment = withSpan(
    { name: "validatePayment" },
    async (paymentDetails: PaymentDetails) => {
        // Critical logic is now traced
    },
);
```
