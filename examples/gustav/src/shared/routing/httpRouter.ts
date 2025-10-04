import { getLogger, Query, RouteHandlerResult } from '@nimbus/core';
import { Context } from '@oak/oak/context';
import { Router as OakRouter } from '@oak/oak/router';
import { mongoManager } from '../mongodb.ts';
import { commandRouter } from './commandRouter.ts';
import { queryRouter } from './queryRouter.ts';

export const router = new OakRouter();

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

router.post('/command', async (ctx) => {
    try {
        const requestBody = await ctx.request.body.json();

        // TODO: How do we implement the authentication context?
        // data: {
        //     ...(ctx.state.authContext && {
        //         authContext: ctx.state.authContext,
        //     }),
        // },

        const result = await commandRouter(requestBody);

        _handleNimbusRouterSuccess(result, ctx);
    } catch (error: any) {
        _handleNimbusRouterError(error, ctx);
    }
});

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

        const result = await queryRouter(queryObject);

        _handleNimbusRouterSuccess(result, ctx);
    } catch (error: any) {
        _handleNimbusRouterError(error, ctx);
    }
});

const _handleNimbusRouterSuccess = (
    result: RouteHandlerResult<any>,
    ctx: Context,
) => {
    ctx.response.status = result.statusCode;

    if (result.headers) {
        for (const header of Object.keys(result.headers)) {
            ctx.response.headers.set(
                header,
                result.headers[header],
            );
        }
    }

    if (result.data) {
        ctx.response.body = result.data;
    }
};

const _handleNimbusRouterError = (
    error: any,
    ctx: Context,
    onError?: (error: any, ctx: Context) => void,
) => {
    if (onError) {
        onError(error, ctx);
    } else {
        getLogger().error({
            category: 'Nimbus',
            message: error.message,
            error,
        });

        const statusCode = error.statusCode ?? 500;
        ctx.response.status = statusCode;

        if (statusCode < 500) {
            ctx.response.body = {
                statusCode,
                ...(error.details ? { code: error.name } : {}),
                ...(error.message ? { message: error.message } : {}),
                ...(error.details ? { details: error.details } : {}),
            };
        } else {
            ctx.response.body = {
                message: 'Internal server error',
            };
        }
    }
};
