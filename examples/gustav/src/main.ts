import {
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from '@nimbus/core';
import { Application } from '@oak/oak/application';
import '@std/dotenv/load';
import { oakCors } from '@tajpouria/cors';
import process from 'node:process';
import { exampleAuthMiddleware } from './contexts/iam/infrastructure/http/auth.middleware.ts';
import { initEventStore } from './shared/infrastructure/eventStore.ts';
import { router } from './shared/infrastructure/http/router.ts';
import { registerSchemas } from './shared/infrastructure/http/schemas.ts';
import { initMongoConnectionManager } from './shared/infrastructure/mongodb.ts';

//
// Setup logging with basic options provided by Nimbus
//
// See https://nimbus.overlap.at/guide/logging.html for more information about logging of Nimbus.
//
setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter: process.env.LOG_FORMAT === 'pretty'
        ? prettyLogFormatter
        : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
});

// Register JSON schemas for validation
registerSchemas();

// Initialize EventStore
initEventStore();

// Initialize MongoDB Manager
initMongoConnectionManager();

// Oak HTTP Server APP
const app = new Application();

app.addEventListener('listen', ({ hostname, port, secure }) => {
    console.log(
        `Listening on: ${secure ? 'https://' : 'http://'}${
            hostname ?? 'localhost'
        }:${port}`,
    );
});

// CORS Middleware
app.use(oakCors());

// Auth Middleware
app.use(exampleAuthMiddleware);

// API Routes
app.use(router.routes());
app.use(router.allowedMethods());

// Get the server started
app.listen({ hostname: '0.0.0.0', port: 3100 });
