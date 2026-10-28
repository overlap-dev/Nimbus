import process from 'node:process';
import { getLogger } from '@nimbus-cqrs/core';
import { getMongoConnectionManager } from '@nimbus-cqrs/mongodb';
import { initCommandRouter } from './api/command.router.ts';
import { initEventSourcingDB } from './api/eventsourcingdb.ts';
import { initMongoDB } from './api/mongodb.ts';
import { initProcessManagers } from './api/process-managers.ts';
import { initQueryRouter } from './api/query.router.ts';
import { startHttpServer } from './http.ts';
import { setupLogger } from './logger.ts';

// Set up the logger first to have it available
// throughout the application with getLogger().

setupLogger();

// We use the CQRS pattern
// and divide the write and read sides of the application.
//
// Routers must be ready before the EventSourcingDB observers start consuming,
// because observers route commands through the command router as they
// process events.

initCommandRouter();

initQueryRouter();

// Make sure Database connections are established first.
// In this example we use EventSourcingDB for the write side of the application.
// and MongoDB to store the read projections.

await initMongoDB();

await initEventSourcingDB();

// We also want to start background processes like process managers and
// schedulers etc.
initProcessManagers();

// In this example we use build an HTTP API
// to interact with the application.
//
// But this would be the place to also start
// other servers like WebSocket, gRPC, etc.

const server = startHttpServer();

const shutdown = async (signal: string) => {
    getLogger().info({
        message: `Received ${signal}, shutting down gracefully...`,
    });

    await server.shutdown();
    await getMongoConnectionManager('default').close();

    process.exit(0);
};

process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(1));
});

process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(1));
});
