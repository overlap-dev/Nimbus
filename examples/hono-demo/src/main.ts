import '@std/dotenv/load';
import process from 'node:process';
import {
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from '@nimbus/core';
import { initMessages } from './shared/shell/messageRouter.ts';
import { app } from './shared/shell/http.ts';

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter: process.env.LOG_FORMAT === 'pretty'
        ? prettyLogFormatter
        : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
});

initMessages();

if (process.env.PORT) {
    const port = parseInt(process.env.PORT);

    Deno.serve({ hostname: '0.0.0.0', port }, app.fetch);

    getLogger().info({
        category: 'API',
        message: `Started application on port ${port}`,
    });
} else {
    getLogger().critical({
        category: 'API',
        message:
            `Could not start the application! Please define a valid port vienvironment variable.`,
    });
}
