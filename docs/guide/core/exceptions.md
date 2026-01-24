---
prev:
    text: "Logging"
    link: "/guide/core/logging"

next:
    text: "Nimbus Hono"
    link: "/guide/hono"
---

# Exceptions

Nimbus provides a set of structured exceptions for handling errors in your application. These exceptions
have and optional status code and can include additional details for debugging.

## Status Codes

The basic Exception class has an optional status code that can be set when creating the exceptions and you can assign any number as a value.

However, Nimbus comes with some built-in exceptions that use the related HTTP status codes. As HTTP status codes are standardized and well-known we thought it would be a good idea to use them even though the Exceptions itself are transport agnostic.

## Built-in Exception Types

| Exception               | Status Code | Use Case                                    |
| ----------------------- | ----------- | ------------------------------------------- |
| `GenericException`      | 500         | Internal server errors, unexpected failures |
| `InvalidInputException` | 400         | Validation errors, malformed requests       |
| `NotFoundException`     | 404         | Resource not found                          |
| `UnauthorizedException` | 401         | Authentication required or failed           |
| `ForbiddenException`    | 403         | Authorization failed, access denied         |

## Basic Usage

All exceptions accept an optional message and details object:

```typescript
import {
    ForbiddenException,
    GenericException,
    InvalidInputException,
    NotFoundException,
    UnauthorizedException,
} from "@nimbus/core";

// Generic server error (500)
throw new GenericException("Something went wrong");

// Invalid input with details (400)
throw new InvalidInputException("The input is invalid", {
    field: "email",
    reason: "Invalid email format",
});

// Unauthorized (401)
throw new UnauthorizedException();

// Forbidden (403)
throw new ForbiddenException();

// Not found with details (404)
throw new NotFoundException("User not found", {
    errorCode: "USER_NOT_FOUND",
    userId: "12345",
});
```

## Converting from Standard Errors

Use `fromError()` to convert a standard JavaScript error while preserving the stack trace:

```typescript
import { GenericException } from "@nimbus/core";

try {
    await someExternalService.call();
} catch (error) {
    const exception = new GenericException();
    exception.fromError(error);
    throw exception;
}
```

## Converting from Zod Errors

If you need to manually handle Zod validation:

```typescript
import { InvalidInputException } from "@nimbus/core";
import { z } from "zod";

const UserSchema = z.object({
    email: z.email(),
    name: z.string().min(1),
});

try {
    UserSchema.parse({ email: "invalid", name: "" });
} catch (error) {
    const exception = new InvalidInputException();
    exception.fromZodError(error);
    throw exception;
}
```

## Creating Custom Exceptions

Create custom exceptions by extending the base `Exception` class:

```typescript
import { Exception } from "@nimbus/core";

export class RateLimitException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            "RATE_LIMIT_EXCEEDED",
            message ?? "Rate limit exceeded",
            details,
            429 // Too Many Requests
        );
    }
}

// Usage
throw new RateLimitException("Too many requests", {
    retryAfter: 60,
    limit: 100,
});
```

## HTTP Integration

When using the `@nimbus/hono` package, exceptions are automatically converted to HTTP responses:

```typescript
import { onError } from "@nimbus/hono";
import { Hono } from "hono";

const app = new Hono();

// Configure error handler
app.onError(onError);

// Exceptions thrown in routes are converted to JSON responses
app.get("/users/:id", async (c) => {
    throw new NotFoundException("User not found", {
        userId: c.req.param("id"),
    });
    // Returns: { "error": "NOT_FOUND", "message": "User not found", "details": { "userId": "123" } }
    // Status: 404
});
```

## Best Practices

### Use Specific Exceptions

Choose the most specific exception type for the situation:

```typescript
// ✅ Good - Specific exception
throw new NotFoundException("Order not found");

// ❌ Bad - Generic exception for known error
throw new GenericException("Order not found");
```

### Include Helpful Details

Add details that help with debugging:

```typescript
throw new InvalidInputException("Invalid order data", {
    errorCode: "INVALID_ORDER",
    field: "quantity",
    value: -5,
    constraint: "must be positive",
});
```

### Use Error Codes

Include machine- and human-readable error codes for client handling:

```typescript
throw new NotFoundException("User not found", {
    errorCode: "USER_NOT_FOUND", // Clients can check this AND translate it to a human-readable error message in multiple languages
    userId: id,
});
```
