import {
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupEventBus,
    setupLogger,
} from '@nimbus/core';
import '@std/dotenv/load';
import process from 'node:process';
import { app } from './shared/shell/http.ts';
import { initMessages } from './shared/shell/messageRouter.ts';
import { initMongoConnectionManager } from './shared/shell/mongodb.ts';

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter: process.env.LOG_FORMAT === 'pretty'
        ? prettyLogFormatter
        : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
});

setupEventBus('default', {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    useJitter: true,
    logPublish: (event) => {
        getLogger().debug({
            category: 'EventBus',
            message: 'Published event',
            data: { event },
            ...(event?.correlationid
                ? { correlationId: event.correlationid }
                : {}),
        });
    },
});

initMessages();

initMongoConnectionManager();

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
            `Could not start the application! Please define a valid port environment variable.`,
    });
}
