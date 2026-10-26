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

setupLogger();

// Routers must be ready before the EventSourcingDB observers start consuming,
// because observers route commands through the command router as they
// process events.

initCommandRouter();

initQueryRouter();

await initMongoDB();

await initEventSourcingDB();

initProcessManagers();

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
