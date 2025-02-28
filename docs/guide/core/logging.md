# Logging

Nimbus provides a very simple logger that enables you to log messages for different severity levels to the console.

It is basically a wrapper around the `console` object and the `console.debug()`, `console.info()`, `console.warn()`, `console.error()` and `console.critical()` methods.

It helps to have consistent logs with important meta information (timestamp, log level,category, error stack traces, etc) across your application.

No other transports or sinks are supported. As we want to keep the core as lightweight as possible and encourage the use of tools like [OpenTelemetry](https://opentelemetry.io/) to transport logs for monitoring and tracing.

As [Deno supports OpenTelemetry](https://docs.deno.com/runtime/fundamentals/open_telemetry/) out of the box, you can easily transport logs to any other monitoring system without the need to change the code of the application.

## Log Levels

Nimbus supports the following log levels for logging messages.

-   `debug` - Outputs a `console.debug()`
-   `info` - Outputs a `console.info()`
-   `warn` - Outputs a `console.warn()`
-   `error` - Outputs a `console.error()`
-   `critical` - Outputs a `console.error()`

Also `silent` can be used in the setup to completely disable log output.

## Setup

Nimbus provides a simple function to setup the logger. You can pass in the log level and the formatter you want to use.

The `prettyLogFormatter` is recommended for development environments only. In production you should use the `jsonLogFormatter`.

For the pretty formatter the `useConsoleColors` option can be used to enable colors in the console output.

::: code-group

```typescript [main.ts]
import {
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from "@nimbus/core";

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter:
        process.env.NODE_ENV === "development"
            ? prettyLogFormatter
            : jsonLogFormatter,
    useConsoleColors: process.env.NODE_ENV === "development",
});
```

:::

## Usage

The logger can be accessed via the `getLogger` function.
The logger is a singleton and will return the same instance every time it is called.

To create a new log you can use the `info`, `warn`, `error` or `critical` methods depending on the severity of the message.

The log input is an object that can contain the following properties:

-   `message` - The message to log.
-   `correlationId` - An optional correlation ID to keep track of commands, queries, and events that are related to each other.
-   `category` - An optional category of the log, useful for grouping logs together.
-   `data` - Optional additional data to log, can be an object with any properties.
-   `error` - Optional error object to log.

The error object is specified as a dedicated property and not as part of the `data` object to make sure all error properties and the stack trace are preserved and logged correctly.

::: code-group

```typescript [logExample.ts]
import { getLogger } from "@nimbus/core";

const logger = getLogger();

logger.debug({
    message: "Hello World!",
    correlationId: "1234567890",
    data: { foo: "bar" },
});

logger.info({ message: "Hello World!" });

logger.warn({
    category: "MyCategory",
    message: "Ding Dong!",
});

logger.error({
    message: "Ohh no!",
    error: new Error("Something went wrong!"),
});

logger.critical({
    category: "MyCategory",
    message: "It is over, run!",
    error: new Error("Something is burning!"),
    data: {
        accountId: "1234567890",
        foo: "bar",
    },
});
```

:::

## Nimbus Logs

As the various Nimbus features have implemented log statements as well it uses the same logger provided by the `getLogger()` function.

Therefore all log statements from Nimbus will respect the log level and formatter you have configured for the application.

In case you do not configure the logger in your application the Nimbus logs will use the default settings.

## Default Settings

```typescript
const defaultSettings = {
    logLevel: "silent",
    formatter: jsonLogFormatter,
    useConsoleColors: false,
};
```
