import {
    createRouter,
    type RouteHandler,
    type RouteHandlerResult,
} from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import { Router as OakRouter, type RouterOptions } from '@oak/oak/router';
import * as log from '@std/log';
import { ulid } from '@std/ulid';
import type { ZodType } from 'zod';

/**
 * The NimbusOakRouter extends the Oak Router
 * to directly route commands and queries coming
 * in from HTTP requests to a Nimbus router.
 */
export class NimbusOakRouter extends OakRouter {
    constructor(opts: RouterOptions = {}) {
        super(opts);
    }

    /**
     * Routes a POST request to a Nimbus command router.
     *
     * @param {string} path - Oak request path
     * @param {string} commandName - Name of the command
     * @param {ZodType} commandType - Zod type of the command
     * @param {RouteHandler} handler - Nimbus Route Handler function
     * @param {Function} onError - Optional function to customize error handling
     */
    command(
        path: string,
        commandName: string,
        commandType: ZodType,
        handler: RouteHandler,
        onError?: (error: any, ctx: Context) => void,
    ) {
        const inputLogFunc = (input: any) => {
            log.getLogger('Nimbus').info({
                msg: `:: ${input?.metadata?.correlationId} - [Command] ${input?.name}`,
            });
        };

        super.post(path, async (ctx: Context) => {
            try {
                const correlationId = ctx.state.correlationId || ulid();
                const requestBody = await ctx.request.body.json();

                const nimbusRouter = createRouter({
                    handlerMap: {
                        [commandName]: {
                            handler,
                            inputType: commandType,
                        },
                    },
                    inputLogFunc,
                });

                const result = await nimbusRouter({
                    name: commandName,
                    data: requestBody,
                    metadata: {
                        correlationId: correlationId,
                        ...(ctx.state.authContext && {
                            authContext: ctx.state.authContext,
                        }),
                    },
                });

                this._handleNimbusRouterSuccess(result, ctx);
            } catch (error: any) {
                this._handleNimbusRouterError(error, ctx, onError);
            }
        });
    }

    /**
     * Routes a GET request to a Nimbus query router.
     *
     * @param {string} path - Oak request path
     * @param {string} queryName - Name of the query
     * @param {ZodType} queryType - Zod type of the query
     * @param {RouteHandler} handler - Nimbus Route Handler function
     * @param {Function} onError - Optional function to customize error handling
     */
    query(
        path: string,
        queryName: string,
        queryType: ZodType,
        handler: RouteHandler,
        onError?: (error: any, ctx: Context) => void,
    ) {
        const inputLogFunc = (input: any) => {
            log.getLogger('Nimbus').info({
                msg: `:: ${input?.metadata?.correlationId} - [Query] ${input?.name}`,
            });
        };

        super.get(path, async (ctx: Context) => {
            try {
                const correlationId = ctx.state.correlationId || ulid();
                const pathParams = (ctx as any).params;

                const queryParams: Record<string, string> = {};
                for (
                    const [key, value] of ctx.request.url.searchParams.entries()
                ) {
                    queryParams[key] = value;
                }

                const nimbusRouter = createRouter({
                    handlerMap: {
                        [queryName]: {
                            handler,
                            inputType: queryType,
                        },
                    },
                    inputLogFunc,
                });

                const result = await nimbusRouter({
                    name: queryName,
                    params: {
                        ...queryParams,
                        ...pathParams,
                    },
                    metadata: {
                        correlationId: correlationId,
                        ...(ctx.state.authContext && {
                            authContext: ctx.state.authContext,
                        }),
                    },
                });

                this._handleNimbusRouterSuccess(result, ctx);
            } catch (error: any) {
                this._handleNimbusRouterError(error, ctx, onError);
            }
        });
    }

    private _handleNimbusRouterSuccess(
        result: RouteHandlerResult<any>,
        ctx: Context,
    ) {
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
    }

    private _handleNimbusRouterError(
        error: any,
        ctx: Context,
        onError?: (error: any, ctx: Context) => void,
    ) {
        if (onError) {
            onError(error, ctx);
        } else {
            log.getLogger('Nimbus').error(error);

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
    }
}
