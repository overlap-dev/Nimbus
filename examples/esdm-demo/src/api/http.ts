import { NotFoundException } from '@nimbus-cqrs/core';
import { getCorrelationId } from '@nimbus-cqrs/hono';
import { Hono } from 'hono';
import { checkApiHealth } from './health.ts';
import { iamRoutes } from './iam/http.ts';
import { ticketingRoutes } from './ticketing/http.ts';

export const apiServer = new Hono();

apiServer.get('/v1/health', async (c) => {
    const now = new Date().toISOString();
    const correlationId = getCorrelationId(c);

    const apiHealth = await checkApiHealth();
    const statusCode = apiHealth.status === 'healthy' ? 200 : 503;

    return c.json(
        {
            ...apiHealth,
            ...(correlationId ? { correlationId } : {}),
            time: now,
        },
        statusCode,
    );
});

apiServer.route('/v1/iam', iamRoutes);
apiServer.route('/v1/ticketing', ticketingRoutes);

apiServer.all('*', () => {
    throw new NotFoundException('Not found', {
        errorCode: 'NOT_FOUND',
    });
});
