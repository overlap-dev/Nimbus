---
prev:
    text: "Quickstart"
    link: "/guide/quickstart"

next:
    text: "Commands"
    link: "/guide/core/commands"
---

# Observability

Observability is a first-class citizen in Nimbus. The framework is designed so that developers can focus on business logic without implementing logging, tracing, and metrics from the ground up.

## Philosophy

Nimbus follows the principle that observability should be built-in, not bolted-on. Every core component - from message routing to event handling - comes with automatic instrumentation. This means:

-   **Zero boilerplate** - Tracing spans and metrics are created automatically
-   **Consistent structure** - All logs follow the same format across your application
-   **Correlation built-in** - Every message carries a correlation ID for distributed tracing

The three pillars of observability in Nimbus:

1. **Logging** - Structured console output with configurable formatters
2. **Tracing** - Distributed traces via OpenTelemetry spans
3. **Metrics** - Counters and histograms for monitoring

## OpenTelemetry Standards

Nimbus uses the [OpenTelemetry API](https://opentelemetry.io/) (`@opentelemetry/api`) for all observability instrumentation. This provides:

-   **Vendor-agnostic** - Export to any OTLP-compatible backend (Jaeger, Zipkin, Grafana, Honeycomb, Datadog, etc.)
-   **Industry standard** - Wide ecosystem support and community adoption
-   **Future-proof** - Backed by CNCF with active development

## Deno Native Observability

Nimbus builds upon [Deno's native OpenTelemetry support](https://docs.deno.com/runtime/fundamentals/open_telemetry/). With Deno 2.x, you can enable OTEL export with zero additional dependencies.

### Enabling OpenTelemetry

Set environment variables to enable OTEL export:

```bash
export OTEL_DENO=true
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-otlp-endpoint.com/otlp"
export OTEL_SERVICE_NAME=your-service-name
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production

deno run -A src/main.ts
```

All traces, metrics, and logs from Nimbus will automatically be exported to your configured backend.

## Built-in Instrumentation

### MessageRouter

The [MessageRouter](/guide/core/router) automatically creates spans for every routed message:

**Tracing:**

-   Span name: `router.route`
-   Attributes: `messaging.system`, `messaging.router_name`, `messaging.destination`, `correlation_id`

**Metrics:**

-   `router_messages_routed_total` - Counter for total messages routed (with `status: success|error`)
-   `router_routing_duration_seconds` - Histogram of routing duration

### EventBus

The [NimbusEventBus](/guide/core/event-bus) instruments both publishing and handling:

**Tracing:**

-   `eventbus.publish` span for event publishing
-   `eventbus.handle` span for event handling with retry tracking

**Metrics:**

-   `eventbus_events_published_total` - Counter for published events
-   `eventbus_events_delivered_total` - Counter for delivered events (with `status: success|error`)
-   `eventbus_event_handling_duration_seconds` - Histogram of handler execution time
-   `eventbus_retry_attempts_total` - Counter for retry attempts
-   `eventbus_event_size_bytes` - Histogram of event sizes

### Logger

The [Logger](/guide/core/logging) outputs structured logs to the console. When combined with Deno's OTEL support, logs are automatically exported alongside traces and metrics.

## Custom Tracing with withSpan()

For business logic that needs custom tracing, use the `withSpan()` higher-order function:

```typescript
import { withSpan } from "@nimbus/core";

const fetchUser = withSpan(
    {
        name: "fetchUser",
        attributes: {
            "user.source": "database",
        },
    },
    async (userId: string) => {
        return await db.users.findById(userId);
    }
);

// Usage - automatically traced
const user = await fetchUser("123");
```

### Adding Dynamic Attributes

Access the span within your function to add attributes based on runtime data:

```typescript
import { withSpan } from "@nimbus/core";
import { Span } from "@opentelemetry/api";

const processOrder = withSpan(
    { name: "processOrder" },
    async (orderId: string, span: Span) => {
        const order = await db.orders.findById(orderId);

        // Add attributes based on the order
        span.setAttribute("order.total", order.total);
        span.setAttribute("order.items", order.items.length);

        return await processPayment(order);
    }
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

-   **Request tracing** - Follow a request through commands, events, and queries
-   **Log correlation** - Group related logs together
-   **Distributed tracing** - Track requests across services

The correlation ID is automatically:

-   Generated when creating messages with `createCommand()`, `createQuery()`, or `createEvent()`
-   Propagated from commands to events they produce
-   Included in log output when provided
-   Added as a span attribute for tracing

```typescript
// Correlation ID is passed from command to event
const command = createCommand<AddUserCommand>({
    type: ADD_USER_COMMAND_TYPE,
    source: "nimbus.overlap.at",
    correlationid: getCorrelationId(c), // From HTTP request
    data: body,
});

// In the handler, create event with same correlation ID
const event = createEvent<UserAddedEvent>({
    type: USER_ADDED_EVENT_TYPE,
    source: "nimbus.overlap.at",
    correlationid: command.correlationid, // Propagate
    data: state,
});
```

## Best Practices

### Use Structured Logging

Always use the structured logger instead of `console.log`:

```typescript
import { getLogger } from "@nimbus/core";

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
const event = createEvent<UserAddedEvent>({
    type: USER_ADDED_EVENT_TYPE,
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
    }
);
```
