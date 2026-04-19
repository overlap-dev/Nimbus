import {
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupEventBus,
    setupLogger,
    setupRouter,
} from '@nimbus/core';
import '@std/dotenv/load';
import process from 'node:process';
import { app } from './shared/shell/http.ts';
import { initMessages } from './shared/shell/messages.ts';
import { mongoManager } from './shared/shell/mongodb.ts';

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

setupRouter('default', {
    logInput: (input) => {
        getLogger().debug({
            category: 'MessageRouter',
            message: 'Received input',
            data: { input },
            ...(input?.correlationid
                ? { correlationId: input.correlationid }
                : {}),
        });
    },
    logOutput: (output) => {
        getLogger().debug({
            category: 'MessageRouter',
            message: 'Output',
            data: { output },
            ...(output?.correlationid
                ? { correlationId: output.correlationid }
                : {}),
        });
    },
});

initMessages();

const shutdown = async (signal: string) => {
    getLogger().info({
        category: 'API',
        message: `Received ${signal}, shutting down ...`,
    });

    try {
        await mongoManager.close();
    } catch (error) {
        getLogger().error({
            category: 'API',
            message: 'Error while closing MongoDB connection',
            data: { error },
        });
    }

    process.exit(0);
};

process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(1));
});

process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(1));
});

if (process.env.PORT) {
    const port = Number.parseInt(process.env.PORT);

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
