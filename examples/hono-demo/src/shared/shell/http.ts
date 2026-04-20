import { correlationId, handleError, logger } from '@nimbus/hono';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import usersRouter from '../../iam/users/shell/http/router.ts';
import { mongoManager } from './mongodb.ts';

export const app = new Hono();

app.use(correlationId());

app.use(logger({
    enableTracing: true,
    tracerName: 'api',
}));

app.use(cors());

app.use(secureHeaders());

app.use(compress());

app.get('/health', async (c) => {
    const dbHealth = await mongoManager.healthCheck();

    return c.json({
        status: dbHealth.status === 'healthy' ? 'ok' : 'error',
        database: dbHealth,
    }, dbHealth.status === 'healthy' ? 200 : 503);
});

app.route('/iam/users', usersRouter);

app.onError(handleError);
