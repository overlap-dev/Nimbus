import { setupLog } from '@nimbus/core';
import { requestCorrelationId } from '@nimbus/oak';
import { Application } from '@oak/oak/application';
import { oakCors } from '@tajpouria/cors';
import 'jsr:@std/dotenv/load';
import process from 'node:process';
import { exampleAuthMiddleware } from './auth/shell/auth.middleware.ts';
import { initEventBusSubscriptions } from './eventBus.ts';
import { initMongoConnectionManager } from './mongodb.ts';
import { router } from './router.ts';

//
// Setup logging with basic options provided by Nimbus
//
// See https://nimbus.overlap.at/guide/logging.html for more information about logging of Nimbus.
//
setupLog({
    logLevel: process.env.LOG_LEVEL,
    format: process.env.NODE_ENV === 'development' ? 'pretty' : 'json',
});

// Initialize MongoDB Manager
initMongoConnectionManager();

// Initialize Event Bus Subscriptions
initEventBusSubscriptions();

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

// Correlation ID Middleware
app.use(requestCorrelationId);

// Auth Middleware
app.use(exampleAuthMiddleware);

// API Routes
app.use(router.routes());
app.use(router.allowedMethods());

// Get the server started
app.listen({ port: 3100 });
