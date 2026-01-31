import {
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
    setupRouter,
} from '@nimbus/core';
import { setupEventSourcingDBClient } from '@nimbus/eventsourcingdb';
import '@std/dotenv/load';
import process from 'node:process';
import { projectViews } from './read/core/projectViews.ts';
import { app } from './shared/shell/http.ts';
import { initMessages } from './shared/shell/messages.ts';

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter: process.env.LOG_FORMAT === 'pretty'
        ? prettyLogFormatter
        : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
});

await setupEventSourcingDBClient(
    {
        url: new URL(process.env.ESDB_URL ?? ''),
        apiToken: process.env.ESDB_API_TOKEN ?? '',
        eventObservers: [
            {
                subject: '/',
                recursive: true,
                eventHandler: projectViews,
            },
        ],
    },
);

setupRouter('writeRouter', {
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

setupRouter('readRouter', {
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

if (process.env.PORT) {
    const port = Number.parseInt(process.env.PORT);

    Deno.serve({
        hostname: '0.0.0.0',
        port,
        onListen: ({ port, hostname }) => {
            getLogger().info({
                category: 'API',
                message: `Started HTTP API on http://${hostname}:${port}`,
            });
        },
    }, app.fetch);
} else {
    getLogger().critical({
        category: 'API',
        message:
            `Could not start the HTTP API! Please define a valid port environment variable.`,
    });
}
