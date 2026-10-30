import process from 'node:process';
import { serve } from '@hono/node-server';
import { getEnv, getLogger } from '@nimbus-cqrs/core';
import { correlationId, handleError, logger } from '@nimbus-cqrs/hono';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { apiServer } from './api/http.ts';

export const app = new Hono();

app.use(correlationId());

app.use(
    logger({
        enableTracing: true,
        tracerName: 'app',
    }),
);

app.use('*', secureHeaders());
app.use('*', compress());

app.route('/api', apiServer);

app.onError(handleError);

export const startHttpServer = () => {
    let port: number;

    try {
        const env = getEnv({
            variables: ['HTTP_PORT'],
        });

        port = Number.parseInt(env.HTTP_PORT, 10);
    } catch (error) {
        getLogger().critical({
            category: 'HttpApi',
            message: `Could not start the HTTP API! Please define a valid port`,
            error: error as Error,
        });

        process.exit(1);
    }

    const server = serve(
        {
            fetch: app.fetch,
            hostname: '0.0.0.0',
            port,
        },
        ({ address, port }) => {
            getLogger().info({
                category: 'HttpApi',
                message: `Started HTTP API on http://${address}:${port}`,
            });
        },
    );

    return {
        shutdown: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            }),
    };
};
