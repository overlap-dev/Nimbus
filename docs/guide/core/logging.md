# Logging

Nimbus provides a simple function to setup the logger. You can pass in the log level and the formatter you want to use.

The `prettyLogFormatter` is recommended for development environments only. In production you should use the `jsonLogFormatter`.

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

```typescript [logExample.ts]
import { getLogger } from "@nimbus/core";

const logger = getLogger();

logger.info({ message: "Hello World!" });

logger.warn({
    category: "MyCategory",
    message: "Ding Dong!",
});

logger.error({
    message: "Ohh no!",
    data: {
        error: new Error("Something went wrong!"),
    },
});

logger.critical({
    category: "MyCategory",
    message: "It is over, run!",
    data: {
        error: new Error("Something is burning!"),
    },
});
```

:::
