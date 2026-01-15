import '@std/dotenv/load';
import process from 'node:process';
import {
    getLogger,
    jsonLogFormatter,
    parseLogLevel,
    prettyLogFormatter,
    setupLogger,
} from '@nimbus/core';
import { correlationId, logger } from '@nimbus/hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';

setupLogger({
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    formatter: process.env.LOG_FORMAT === 'pretty'
        ? prettyLogFormatter
        : jsonLogFormatter,
    useConsoleColors: process.env.LOG_FORMAT === 'pretty',
});

const app = new Hono();

app.use(correlationId());

app.use(logger({
    enableTracing: true,
    tracerName: 'api',
}));

app.use(cors());

app.use(secureHeaders());

app.use(compress());

app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});

if (process.env.PORT) {
    const port = parseInt(process.env.PORT);

    Deno.serve({ port }, app.fetch);
    getLogger().info({
        category: 'API',
        message: `Started application on port ${port}`,
    });
} else {
    getLogger().critical({
        category: 'API',
        message:
            `Could not start the application! Please define a valid port vienvironment variable.`,
    });
}
