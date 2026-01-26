---
prev:
    text: "Nimbus Hono"
    link: "/guide/hono"

next:
    text: "Logger Middleware"
    link: "/guide/hono/logger"
---

# CorrelationID Middleware

The CorrelationID middleware extracts a correlation ID from incoming request headers or generates a new one using ULID. This ID is stored in the Hono context and optionally added to response headers, enabling request tracing across your application.

## Basic Usage

```typescript
import { Hono } from "hono";
import { correlationId, getCorrelationId } from "@nimbus/hono";

const app = new Hono();

// Add the middleware
app.use(correlationId());

app.get("/", (c) => {
    const id = getCorrelationId(c);
    return c.json({ correlationId: id });
});
```

## Header Detection

The middleware checks the following headers in order of priority:

| Priority | Header Name        |
| -------- | ------------------ |
| 1        | `x-correlation-id` |
| 2        | `x-request-id`     |
| 3        | `request-id`       |

If none of these headers are present, a new ULID is generated.

## Configuration Options

| Option                 | Type      | Default              | Description                                |
| ---------------------- | --------- | -------------------- | ------------------------------------------ |
| `addToResponseHeaders` | `boolean` | `true`               | Add the correlation ID to response headers |
| `responseHeaderName`   | `string`  | `"x-correlation-id"` | The header name to use in the response     |

```typescript
import { correlationId } from "@nimbus/hono";

// Custom configuration
app.use(
    correlationId({
        addToResponseHeaders: true,
        responseHeaderName: "x-request-id",
    })
);
```

## Retrieving the Correlation ID

Use the `getCorrelationId()` helper function to retrieve the correlation ID from the Hono context:

```typescript
import { getCorrelationId } from "@nimbus/hono";

app.get("/users/:id", async (c) => {
    const correlationId = getCorrelationId(c);

    // Use in logging
    logger.info({
        message: "Fetching user",
        correlationId,
    });

    // Pass to commands/queries
    const command = createCommand({
        type: "get-user",
        correlationid: correlationId,
        data: { id: c.req.param("id") },
    });

    return c.json(await router.route(command));
});
```
