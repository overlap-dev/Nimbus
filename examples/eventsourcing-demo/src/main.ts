import process from 'node:process';
import {
    createLogTruncator,
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from '@nimbus-cqrs/core';
import { getMongoConnectionManager } from '@nimbus-cqrs/mongodb';
import { initEventSourcingDB } from './eventsourcingdb.ts';
import { startHttpServer } from './http.ts';
import { initMongoDB } from './mongodb.ts';
import { initQueryRouter } from './read/queryRouter.ts';
import { shutdownTelemetry } from './telemetry.ts';
import { initCommandRouter } from './write/commandRouter.ts';

// Set up the logger first to have it available
// throughout the application with getLogger().

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter:
        process.env.LOG_FORMAT === 'pretty'
            ? prettyLogFormatter
            : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
    truncator: createLogTruncator(),
});

// Make sure Database connections are established first.
// In this example we use EventSourcingDB for the write side of the application.
// and MongoDB to store the read projections.

initMongoDB();

await initEventSourcingDB();

// We use the CQRS pattern
// and divide the write and read sides of the application.

initCommandRouter();

initQueryRouter();

// In this example we use build an HTTP API
// to interact with the application.
//
// But this would be the place to also start
// other servers like WebSocket, gRPC, etc.

const server = startHttpServer();

// We want to shutdown gracefully

const shutdown = async (signal: string) => {
    getLogger().info({
        message: `Received ${signal}, shutting down gracefully...`,
    });

    await server.shutdown();
    await getMongoConnectionManager('default').close();

    // Last, so spans from the drained requests are still exported.
    await shutdownTelemetry();

    process.exit(0);
};

process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(1));
});

process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(1));
});
