# Logging

For logging Nimbus uses the [`@std/log`](https://jsr.io/@std/log) library.

## Default setup

Nimbus provides a simple function to setup the logger. You can pass in the log level and the format you want to use.

The `pretty` format is recommended for development environments only. In production you should use the `json` format.

::: code-group

```typescript [main.ts]
import { setupLog } from "@nimbus/core";

setupLog({
    logLevel: process.env.LOG_LEVEL,
    format: process.env.NODE_ENV === "development" ? "pretty" : "json",
});
```

```typescript [logExample.ts]
import * as log from "@std/log";

log.info({ msg: "Hello World!" });

log.warn({ msg: "Ding Dong!" });

log.error({ msg: "Ohh no!", error: new Error("Something went wrong!") });

log.critical({
    msg: "It is over, run!",
    error: new Error("Something is burning!"),
});
```

:::

## Advanced Setup

In case you want to configure the logger in another way you can use the `setup` function from the `@std/log` library. And add `Nimbus` to the loggers object.

View the [@std/log docs](https://jsr.io/@std/log) for all configuration options.

::: code-group

```typescript [main.ts]
import * as log from "@std/log";

log.setup({
    handlers: {
        default: new log.ConsoleHandler("INFO", {
            formatter: log.formatters.jsonFormatter,
        }),
    },

    loggers: {
        Nimbus: {
            level: "INFO",
            handlers: ["default"],
        },
    },
});
```

:::
