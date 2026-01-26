---
prev:
    text: "CorrelationID Middleware"
    link: "/guide/hono/correlationid"

next:
    text: "onError Handler"
    link: "/guide/hono/on-error"
---

# Logger Middleware

The Logger middleware logs HTTP requests and responses with timing information using the Nimbus logger. It optionally integrates with OpenTelemetry for distributed tracing.

## Basic Usage

```typescript
import { Hono } from "hono";
import { correlationId, logger } from "@nimbus/hono";

const app = new Hono();

// Use correlationId middleware first to enable correlation ID in logs
app.use(correlationId());
app.use(logger());
```

## Configuration Options

| Option          | Type      | Default    | Description                               |
| --------------- | --------- | ---------- | ----------------------------------------- |
| `enableTracing` | `boolean` | `true`     | Enable OpenTelemetry tracing for requests |
| `tracerName`    | `string`  | `"nimbus"` | The name of the tracer for OpenTelemetry  |

```typescript
import { logger } from "@nimbus/hono";

app.use(
    logger({
        enableTracing: true,
        tracerName: "api",
    })
);
```

## Log Output

The middleware logs each request and response using the Nimbus logger:

**Request log:**

```
[API] INFO :: REQ: [GET] /users/123
```

**Response log (with timing):**

```
[API] INFO :: RES: [GET] /users/123 - 45ms
```

Both logs include the correlation ID when the `correlationId` middleware is used.

## OpenTelemetry Tracing

When `enableTracing` is set to `true`, the middleware:

1. **Extracts trace context** from incoming `traceparent` and `tracestate` headers
2. **Creates a server span** for the HTTP request
3. **Records span attributes** for observability
4. **Propagates context** so child spans can be created in handlers

### Span Attributes

| Attribute          | Description                       |
| ------------------ | --------------------------------- |
| `http.method`      | The HTTP method (GET, POST, etc.) |
| `url.path`         | The request path                  |
| `http.target`      | The full request URL              |
| `correlation_id`   | The correlation ID (if available) |
| `http.status_code` | The response status code          |

### Example with Tracing

```typescript
import { Hono } from "hono";
import { correlationId, logger } from "@nimbus/hono";

const app = new Hono();

app.use(correlationId());
app.use(
    logger({
        enableTracing: true,
        tracerName: "api",
    })
);

app.get("/users/:id", async (c) => {
    // This handler runs within the HTTP span context
    // Any spans created here will be children of the HTTP span
    const user = await userRepository.findOne({
        filter: { _id: c.req.param("id") },
    });

    return c.json(user);
});
```

## Error Handling

When an error occurs during request handling:

-   The span status is set to `ERROR`
-   The error message is recorded in the span
-   The exception is recorded for debugging
-   The error is re-thrown for the error handler to process
