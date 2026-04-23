import {
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from '@nimbus-cqrs/core';
import '@std/dotenv/load';
import process from 'node:process';
import { initEventSourcingDB } from './eventsourcingdb.ts';
import { shutdownHttpServer, startHttpServer } from './http.ts';
import { initMongoDB } from './mongodb.ts';
import { initQueryRouter } from './read/queryRouter.ts';
import { initCommandRouter } from './write/commandRouter.ts';

// Set up the logger first to have it available
// throughout the application with getLogger().

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter: process.env.LOG_FORMAT === 'pretty'
        ? prettyLogFormatter
        : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
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

Deno.addSignalListener('SIGTERM', () => {
    shutdownHttpServer(server, 'SIGTERM');
});

Deno.addSignalListener('SIGINT', () => {
    shutdownHttpServer(server, 'SIGINT');
});

// Clean up this APP.
// Add MongoDB as persistent storage on the read side.
// Queries vs. Views can one view have multiple queries? - Yes a users view e.g. can have GET_USER and LIST_USERS
