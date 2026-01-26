---
prev:
    text: "Logger Middleware"
    link: "/guide/hono/logger"

next:
    text: "Nimbus MongoDB"
    link: "/guide/mongodb"
---

# onError Handler

The `handleError` function is an error handler for Hono applications that converts Nimbus exceptions to structured HTTP JSON responses.

## Basic Usage

```typescript
import { Hono } from "hono";
import { handleError } from "@nimbus/hono";

const app = new Hono();

// Register the error handler
app.onError(handleError);
```

## Response Format

When a Nimbus exception is thrown, the handler returns a JSON response with the following structure:

```json
{
    "error": "EXCEPTION_NAME",
    "message": "Human-readable error message",
    "details": { ... }
}
```

| Field     | Description                                              |
| --------- | -------------------------------------------------------- |
| `error`   | The exception name (e.g., `NOT_FOUND`, `INVALID_INPUT`)  |
| `message` | The error message provided when throwing the exception   |
| `details` | Optional additional details (only included if provided)  |

## Status Code Mapping

The HTTP status code is taken directly from the exception's `statusCode` property:

| Exception               | Status Code | Response `error`        |
| ----------------------- | ----------- | ----------------------- |
| `GenericException`      | 500         | `GENERIC_EXCEPTION`     |
| `InvalidInputException` | 400         | `INVALID_INPUT`         |
| `NotFoundException`     | 404         | `NOT_FOUND`             |
| `UnauthorizedException` | 401         | `UNAUTHORIZED`          |
| `ForbiddenException`    | 403         | `FORBIDDEN`             |
| Custom exceptions       | (custom)    | (custom name)           |

## Logging Behavior

The handler logs errors differently based on the status code:

| Status Code | Log Level  | Description                              |
| ----------- | ---------- | ---------------------------------------- |
| 5xx         | `error`    | Server errors that need investigation    |
| 4xx         | `debug`    | Client errors, typically expected        |
| Unhandled   | `critical` | Non-Nimbus errors, unexpected failures   |

## Example: Exception Handling

```typescript
import { Hono } from "hono";
import { handleError } from "@nimbus/hono";
import { NotFoundException, InvalidInputException } from "@nimbus/core";

const app = new Hono();

app.get("/users/:id", async (c) => {
    const user = await findUser(c.req.param("id"));

    if (!user) {
        throw new NotFoundException("User not found", {
            userId: c.req.param("id"),
        });
    }

    return c.json(user);
});

app.post("/users", async (c) => {
    const body = await c.req.json();

    if (!body.email) {
        throw new InvalidInputException("Email is required", {
            field: "email",
        });
    }

    const user = await createUser(body);
    return c.json(user, 201);
});

app.onError(handleError);
```

### Response Examples

**NotFoundException (404):**
```json
{
    "error": "NOT_FOUND",
    "message": "User not found",
    "details": {
        "userId": "123"
    }
}
```

**InvalidInputException (400):**
```json
{
    "error": "INVALID_INPUT",
    "message": "Email is required",
    "details": {
        "field": "email"
    }
}
```

**Unhandled Error (500):**
```json
{
    "error": "INTERNAL_SERVER_ERROR"
}
```

## Complete Application Setup

```typescript
import { Hono } from "hono";
import { correlationId, handleError, logger } from "@nimbus/hono";
import { setupLogger, parseLogLevel } from "@nimbus/core";

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
});

const app = new Hono();

app.use(correlationId());
app.use(logger({ enableTracing: true }));

// Your routes here
app.get("/health", (c) => c.json({ status: "ok" }));

// Error handler must be registered last
app.onError(handleError);

export default app;
```
