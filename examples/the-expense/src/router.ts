import { getLogger } from '@nimbus/core';
import { NimbusOakRouter } from '@nimbus/oak';
import { accountRouter } from './account/shell/account.router.ts';
import { mongoManager } from './mongodb.ts';

export const router = new NimbusOakRouter();

router.get('/health', async (ctx) => {
    const logger = getLogger();
    const now = new Date().toISOString();

    const mongoHealth = await mongoManager.healthCheck();

    logger.info({
        message: 'Health check',
        data: {
            time: now,
            database: { ...mongoHealth },
            ...(ctx.state.correlationId
                ? { correlationId: ctx.state.correlationId }
                : {}),
            ...(ctx.state.authContext
                ? { authContext: ctx.state.authContext }
                : {}),
        },
    });

    ctx.response.body = {
        status: mongoHealth.status === 'healthy' ? 'OK' : 'ERROR',
        http: {
            status: 'healthy',
        },
        database: { ...mongoHealth },
        ...(ctx.state.correlationId
            ? { correlationId: ctx.state.correlationId }
            : {}),
        time: now,
    };
});

router.use(
    '/accounts',
    accountRouter.routes(),
    accountRouter.allowedMethods(),
);
