import {
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupEventBus,
    setupLogger,
    setupRouter,
} from '@nimbus-cqrs/core';
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

if (!process.env.PORT) {
    getLogger().critical({
        category: 'API',
        message:
            `Could not start the application! Please define a valid PORT environment variable.`,
    });
    process.exit(1);
}

const port = Number.parseInt(process.env.PORT);

const server = Bun.serve({
    hostname: '0.0.0.0',
    port,
    fetch: app.fetch,
});

getLogger().info({
    category: 'API',
    message: `Started application on port ${server.port}`,
});

const shutdown = async (signal: string) => {
    getLogger().info({
        category: 'API',
        message: `Received ${signal}, shutting down ...`,
    });

    server.stop();

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
