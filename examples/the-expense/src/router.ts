import { NimbusOakRouter } from '@nimbus/oak';
import * as log from '@std/log';
import { accountRouter } from './account/shell/account.router.ts';
import { mongoManager } from './mongodb.ts';

export const router = new NimbusOakRouter();

router.get('/health', async (ctx) => {
    const now = new Date().toISOString();

    const mongoHealth = await mongoManager.healthCheck();

    log.info({
        message: 'Health check',
        time: now,
        database: { ...mongoHealth },
        ...(ctx.state.correlationId
            ? { correlationId: ctx.state.correlationId }
            : {}),
        ...(ctx.state.authContext
            ? { authContext: ctx.state.authContext }
            : {}),
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
