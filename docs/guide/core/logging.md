---
description: Structured console logging with JSON or pretty formatters and OpenTelemetry log export via Deno.
---

# Logging

Nimbus provides a structured logger that outputs consistent, formatted log messages to the console. The logger integrates with Deno's native OpenTelemetry support for automatic log export to observability backends.

::: tip An in Depth Example
This guide also has an in depth example of a working application built with Nimbus. Combining DDD, CQRS and Event Sourcing.

Check out the [In Depth Example](/guide/in-depth-example) page to learn how everything is connected and works out in a real-world application.
:::

## Setup and Configuration

Configure the logger at application startup using `setupLogger()`:

```typescript
import {
    createLogTruncator,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from "@nimbus-cqrs/core";
import process from "node:process";

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter:
        process.env.LOG_FORMAT === "pretty"
            ? prettyLogFormatter
            : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === "pretty",
    truncator: createLogTruncator(),
});
```

### Configuration Options

| Option             | Type           | Default            | Description                                  |
| ------------------ | -------------- | ------------------ | -------------------------------------------- |
| `logLevel`         | `LogLevel`     | `'silent'`         | Minimum level to output                      |
| `formatter`        | `LogFormatter` | `jsonLogFormatter` | Function to format log records               |
| `useConsoleColors` | `boolean`      | `false`            | Enable colored output (for pretty formatter) |
| `truncator`        | `LogTruncator` | `undefined`        | Optional truncator for log inputs            |

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
import { parseLogLevel } from "@nimbus-cqrs/core";

// Returns 'info' if LOG_LEVEL is 'info', otherwise returns default 'silent'
const level = parseLogLevel(process.env.LOG_LEVEL);
```

## Basic Usage

Access the logger using `getLogger()`:

```typescript
import { getLogger } from "@nimbus-cqrs/core";

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

| Property         | Type                      | Description                                                                       |
| ---------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `message`        | `string`                  | **Required.** The log message                                                     |
| `category`       | `string`                  | Optional category for grouping logs (defaults to `'Default'`)                     |
| `data`           | `Record<string, unknown>` | Optional structured data to include                                               |
| `error`          | `Error`                   | Optional error with stack trace                                                   |
| `correlationId`  | `string`                  | Optional ID for tracing related operations                                        |
| `skipTruncation` | `boolean`                 | When `true`, skips the configured truncator for this call (not emitted in output) |

## Formatters

Nimbus provides two built-in formatters:

### JSON Formatter (Production)

Outputs structured JSON for easy parsing by log aggregation tools:

```typescript
import { jsonLogFormatter, setupLogger } from "@nimbus-cqrs/core";

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
import { prettyLogFormatter, setupLogger, getLogger } from "@nimbus-cqrs/core";

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

## Truncation

By default, log inputs are passed through unchanged. To avoid flooding log pipelines with large payloads, configure a truncator via `setupLogger`.

Use the built-in factory, or supply a custom `LogTruncator`:

```typescript
import { createLogTruncator, setupLogger } from "@nimbus-cqrs/core";

// Built-in defaults
setupLogger({
    truncator: createLogTruncator(),
});

// Override limits
setupLogger({
    truncator: createLogTruncator({
        maxBytes: 8_192,
        maxArrayItems: 50,
        maxObjectKeys: 50,
        maxDepth: 8,
        maxCategoryLength: 50,
        maxMessageLength: 100,
        maxStackLength: 200,
        maxDataStringLength: 200,
    }),
});
```

The built-in truncator processes each `LogInput` field separately and leaves `correlationId` untouched:

| Field                  | Behavior                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `message` / `category` | String length caps                                                                                                                                                       |
| `data`                 | Structural limits (strings, arrays, object keys, depth, circular refs, common JS types), then a byte-size cliff for oversized or unserializable `data`                   |
| `error`                | Stays `Error`-shaped; truncates `message` / `stack`; copies enumerable custom fields; walks `cause` and aggregate errors (including non-`Error` values) up to `maxDepth` |
| `correlationId`        | Never truncated                                                                                                                                                          |
| `skipTruncation`       | Logger control flag; when `true`, truncation is skipped for that call                                                                                                    |

Inside `data`, common values are normalized before limits apply: `bigint` → string, `Date` → ISO string, `RegExp` → pattern string, `Map` / `Set` → arrays (with `maxArrayItems`), `Error` → plain object, and `ArrayBuffer` / typed arrays → size summaries.

### Truncator options

| Option                | Default | Applies to                                               |
| --------------------- | ------- | -------------------------------------------------------- |
| `maxBytes`            | `16384` | `data` size cliff only                                   |
| `maxArrayItems`       | `50`    | Arrays inside `data` (including converted `Map` / `Set`) |
| `maxObjectKeys`       | `50`    | Own enumerable keys on plain objects inside `data`       |
| `maxDepth`            | `8`     | Object depth in `data`; also bounds `error.cause` chains |
| `maxCategoryLength`   | `50`    | `category`                                               |
| `maxMessageLength`    | `200`   | `message` and `error.message`                            |
| `maxStackLength`      | `200`   | `error.stack`                                            |
| `maxDataStringLength` | `200`   | Strings inside `data`                                    |

If a configured truncator throws, the logger fails open: it warns to the console and logs the original input.

Pass `skipTruncation: true` on a single log call to bypass truncation when you intentionally need the full payload:

```typescript
getLogger().info({
    message: "Full debug dump",
    data: hugePayload,
    skipTruncation: true,
});
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
    // truncator: undefined (no truncation)
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

- `debug`: Detailed info for debugging (disabled in production)
- `info`: Normal application flow
- `warn`: Unexpected but recoverable situations
- `error`: Errors that need investigation
- `critical`: Failures requiring immediate action
