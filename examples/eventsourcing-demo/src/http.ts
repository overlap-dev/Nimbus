import { getLogger } from '@nimbus-cqrs/core';
import {
    correlationId,
    getCorrelationId,
    handleError,
    logger,
} from '@nimbus-cqrs/hono';
import { getEnv } from '@nimbus-cqrs/utils';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { mongoManager } from './mongodb.ts';
import httpQueryRouter from './read/http.ts';
import httpCommandRouter from './write/http.ts';

export const app = new Hono();

app.use(correlationId());

app.use(logger({
    enableTracing: true,
    tracerName: 'api',
}));

app.use(cors());

app.use(secureHeaders({
    crossOriginResourcePolicy: 'cross-origin',
}));

app.use(compress());

app.get('/health', async (c) => {
    const mongoDbHealth = await mongoManager.healthCheck();

    // TODO: Add a health check function for EventSourcingDB

    return c.json({
        timestamp: new Date().toISOString(),
        correlationId: getCorrelationId(c),
        status: {
            httpApi: 'OK',
            mongoDb: mongoDbHealth.status === 'healthy' ? 'OK' : 'ERROR',
        },
    });
});

app.route('/command', httpCommandRouter);
app.route('/query', httpQueryRouter);

app.onError(handleError);

export const shutdownHttpServer = async (
    server: Deno.HttpServer<Deno.NetAddr>,
    signal: string,
) => {
    const env = getEnv({
        variables: ['NODE_ENV'],
    });

    if (env.NODE_ENV === 'development') {
        getLogger().info({
            category: 'HttpApi',
            message:
                `Received ${signal}, skipping shutdown in development mode...`,
        });

        return;
    }

    getLogger().info({
        category: 'HttpApi',
        message: `Received ${signal}, shutting down gracefully...`,
    });

    try {
        await server.shutdown();

        getLogger().info({
            category: 'HttpApi',
            message: 'HTTP API shutdown complete',
        });
        Deno.exit(0);
    } catch (error) {
        getLogger().error({
            category: 'HttpApi',
            message: 'Error during HTTP API shutdown',
            error: error as Error,
        });
        Deno.exit(1);
    }
};

export const startHttpServer = () => {
    let port: number;

    try {
        const env = getEnv({
            variables: ['HTTP_PORT'],
        });

        port = Number.parseInt(env.HTTP_PORT);
    } catch (error) {
        getLogger().critical({
            category: 'HttpApi',
            message: `Could not start the HTTP API! Please define a valid port`,
            error: error as Error,
        });

        Deno.exit(1);
    }

    const server = Deno.serve({
        hostname: '0.0.0.0',
        port: port!,
        onListen: ({ port, hostname }) => {
            getLogger().info({
                category: 'HttpApi',
                message: `Started HTTP API on http://${hostname}:${port}`,
            });
        },
    }, app.fetch);

    return server;
};
