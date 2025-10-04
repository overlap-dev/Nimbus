import { getLogger, Query } from '@nimbus/core';
import { handleOakError, NimbusOakRouter } from '@nimbus/oak';
import { mongoManager } from '../mongodb.ts';
import { commandRouter } from './commandRouter.ts';
import { queryRouter } from './queryRouter.ts';

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

// Command endpoint - uses the Oak adapter to bridge MessageRouter to HTTP
router.command({
    path: '/command',
    router: commandRouter,
});

// Query endpoint - uses the Oak adapter to bridge MessageRouter to HTTP
router.get('/query', async (ctx) => {
    try {
        const queryParams: Record<string, string> = {};
        for (
            const [key, value] of ctx.request.url.searchParams.entries()
        ) {
            queryParams[key] = value;
        }

        const queryObject: Query<unknown> = {
            specversion: '1.0',
            id: queryParams.id,
            correlationid: queryParams.correlationid,
            time: queryParams.time,
            source: queryParams.source,
            type: queryParams.type,
            ...(queryParams.datacontenttype &&
                { datacontenttype: queryParams.datacontenttype }),
            ...(queryParams.dataschema &&
                { dataschema: queryParams.dataschema }),
            data: {},
        };

        if (queryObject.datacontenttype === 'application/json') {
            queryObject.data = JSON.parse(queryParams.data);
        }

        // TODO: How do we implement the authentication context?
        // data: {
        //     ...(ctx.state.authContext && {
        //         authContext: ctx.state.authContext,
        //     }),
        // },

        const result = await queryRouter.route(queryObject);

        ctx.response.status = 200;
        ctx.response.body = result as any;
    } catch (error: any) {
        handleOakError(error, ctx);
    }
});
