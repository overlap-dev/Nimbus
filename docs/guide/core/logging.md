---
prev:
    text: "Event Bus"
    link: "/guide/core/event-bus"

next:
    text: "Exceptions"
    link: "/guide/core/exceptions"
---

# Logging

Nimbus provides a structured logger that outputs consistent, formatted log messages to the console. The logger integrates with Deno's native OpenTelemetry support for automatic log export to observability backends.

::: info Example Application
The examples on this page reference the hono-demo application.

You can find the full example on GitHub: [hono-demo](https://github.com/overlap-dev/Nimbus/tree/main/examples/hono-demo)
:::

## Setup and Configuration

Configure the logger at application startup using `setupLogger()`:

```typescript
import {
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from "@nimbus/core";
import process from "node:process";

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter:
        process.env.LOG_FORMAT === "pretty"
            ? prettyLogFormatter
            : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === "pretty",
});
```

### Configuration Options

| Option             | Type           | Default            | Description                                  |
| ------------------ | -------------- | ------------------ | -------------------------------------------- |
| `logLevel`         | `LogLevel`     | `'silent'`         | Minimum level to output                      |
| `formatter`        | `LogFormatter` | `jsonLogFormatter` | Function to format log records               |
| `useConsoleColors` | `boolean`      | `false`            | Enable colored output (for pretty formatter) |

## Log Levels

Nimbus supports the following log levels in order of severity:

| Level      | Method            | Description                                  |
| ---------- | ----------------- | -------------------------------------------- |
| `debug`    | `console.debug()` | Detailed debugging information               |
| `info`     | `console.info()`  | General information about application flow   |
| `warn`     | `console.warn()`  | Warning conditions that should be reviewed   |
| `error`    | `console.error()` | Error conditions that need attention         |
| `critical` | `console.error()` | Critical failures requiring immediate action |
| `silent`   | _(none)_          | Disables all log output                      |

Messages below the configured log level are silently ignored.

### Parsing Log Levels

Use `parseLogLevel()` to safely parse environment variables:

```typescript
import { parseLogLevel } from "@nimbus/core";

// Returns 'info' if LOG_LEVEL is 'info', otherwise returns default 'silent'
const level = parseLogLevel(process.env.LOG_LEVEL);
```

## Basic Usage

Access the logger using `getLogger()`:

```typescript
import { getLogger } from "@nimbus/core";

const logger = getLogger();

logger.debug({
    message: "Processing request",
    category: "API",
    data: { method: "POST", path: "/users" },
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
});

logger.info({
    message: "User created successfully",
    category: "Users",
    data: { userId: "12345" },
});

logger.warn({
    message: "Rate limit approaching",
    category: "API",
    data: { currentRate: 95, maxRate: 100 },
});

logger.error({
    message: "Failed to process payment",
    category: "Payments",
    error: new Error("Payment gateway timeout"),
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
});

logger.critical({
    message: "Database connection lost",
    category: "Database",
    error: new Error("Connection refused"),
});
```

## Log Input

The log input object can contain the following properties:

| Property        | Type                      | Description                                                   |
| --------------- | ------------------------- | ------------------------------------------------------------- |
| `message`       | `string`                  | **Required.** The log message                                 |
| `category`      | `string`                  | Optional category for grouping logs (defaults to `'Default'`) |
| `data`          | `Record<string, unknown>` | Optional structured data to include                           |
| `error`         | `Error`                   | Optional error with stack trace                               |
| `correlationId` | `string`                  | Optional ID for tracing related operations                    |

## Formatters

Nimbus provides two built-in formatters:

### JSON Formatter (Production)

Outputs structured JSON for easy parsing by log aggregation tools:

```typescript
import { jsonLogFormatter, setupLogger } from "@nimbus/core";

setupLogger({
    logLevel: "info",
    formatter: jsonLogFormatter,
});

// Output:
// {"timestamp":"2025-01-22T10:00:00.000Z","level":"info","category":"Users","message":"User created","data":{"userId":"123"}}
```

### Pretty Formatter (Development)

Outputs human-readable colored logs for development:

```typescript
import { prettyLogFormatter, setupLogger, getLogger } from "@nimbus/core";

setupLogger({
    logLevel: "debug",
    formatter: prettyLogFormatter,
    useConsoleColors: true,
});

getLogger().debug({
    message: "My message",
    category: "Category",
    data: { userId: "12345" },
});

// Outputs:
// [Category] DEBUG :: My message
// {
//   userId: '12345'
// }
```

## OpenTelemetry Integration

When combined with Deno's native OpenTelemetry support, logs are automatically exported alongside traces and metrics. See the [Observability](/guide/core/observability) documentation for details on enabling OTEL export.

```bash
export OTEL_DENO=true
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-otlp-endpoint.com/otlp"
export OTEL_SERVICE_NAME=your-service-name

deno run src/main.ts
```

## Default Settings

If `setupLogger()` is not called, the logger uses these defaults:

```typescript
const defaultSettings = {
    logLevel: "silent",
    formatter: jsonLogFormatter,
    useConsoleColors: false,
};
```

This means logs are silent by default - you must explicitly configure the logger to see output.

## Nimbus Internal Logs

All Nimbus components (Router, EventBus, etc.) use the same logger configured via `setupLogger()`. This ensures consistent log formatting and level filtering across your application.

## Best Practices

### Use Categories

Group related logs with consistent category names:

```typescript
logger.info({ message: "Query executed", category: "Database" });
logger.info({ message: "Request received", category: "API" });
logger.info({ message: "Email sent", category: "Notifications" });
```

### Include Correlation IDs

Always include correlation IDs when available for distributed tracing:

```typescript
logger.info({
    message: "Processing order",
    category: "Orders",
    data: { orderId: order.id },
    correlationId: command.correlationid,
});
```

### Log Errors Properly

Use the dedicated `error` property for errors to preserve stack traces:

```typescript
// ✅ Good - Error is properly captured
logger.error({
    message: "Failed to save user",
    error: error,
    correlationId: command.correlationid,
});

// ❌ Bad - Stack trace is lost
logger.error({
    message: "Failed to save user",
    data: { error: error.message },
});
```

### Use Appropriate Log Levels

-   `debug`: Detailed info for debugging (disabled in production)
-   `info`: Normal application flow
-   `warn`: Unexpected but recoverable situations
-   `error`: Errors that need investigation
-   `critical`: Failures requiring immediate action
