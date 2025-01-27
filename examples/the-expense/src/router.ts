import { NimbusOakRouter } from '@nimbus/oak';
import * as log from '@std/log';
import { accountRouter } from './account/shell/account.router.ts';

export const router = new NimbusOakRouter();

router.get('/health', (ctx) => {
    const now = new Date().toISOString();

    log.info({
        message: 'Health check',
        time: now,
        ...(ctx.state.correlationId
            ? { correlationId: ctx.state.correlationId }
            : {}),
        ...(ctx.state.authContext
            ? { authContext: ctx.state.authContext }
            : {}),
    });

    ctx.response.body = {
        status: 'OK',
        time: now,
    };
});

router.use(
    '/accounts',
    accountRouter.routes(),
    accountRouter.allowedMethods(),
);
