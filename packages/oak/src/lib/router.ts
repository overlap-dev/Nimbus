import {
    createRouter,
    getLogger,
    type RouteHandler,
    type RouteHandlerResult,
} from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import { Router as OakRouter, type RouterOptions } from '@oak/oak/router';
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
     * @param {string} commandType - Type of the command
     * @param {ZodType} commandSchema - Schema (ZodType) of the command
     * @param {RouteHandler} handler - Nimbus Route Handler function
     * @param {Function} onError - Optional function to customize error handling
     */
    command(
        path: string,
        commandType: string,
        commandSchema: ZodType,
        handler: RouteHandler,
        onError?: (error: any, ctx: Context) => void,
    ) {
        const inputLogFunc = (input: any) => {
            getLogger().info({
                category: 'Nimbus',
                ...(input?.data?.correlationId && {
                    correlationId: input.data.correlationId,
                }),
                message:
                    `${input?.data?.correlationId} - [Command] ${input?.type} from ${input?.source}`,
            });
        };

        super.post(path, async (ctx: Context) => {
            try {
                const correlationId = ctx.state.correlationId ?? ulid();
                const requestBody = await ctx.request.body.json();

                const nimbusRouter = createRouter({
                    handlerMap: {
                        [commandType]: {
                            handler,
                            inputType: commandSchema,
                        },
                    },
                    inputLogFunc,
                });

                const result = await nimbusRouter({
                    specversion: '1.0',
                    id: correlationId,
                    source: ctx.request.url.toString(),
                    type: commandType,
                    data: {
                        correlationId: correlationId,
                        payload: requestBody,
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
     * @param {string} queryType - Type of the query
     * @param {ZodType} querySchema - Schema (ZodType) of the query
     * @param {RouteHandler} handler - Nimbus Route Handler function
     * @param {Function} onError - Optional function to customize error handling
     */
    query(
        path: string,
        queryType: string,
        querySchema: ZodType,
        handler: RouteHandler,
        onError?: (error: any, ctx: Context) => void,
    ) {
        const inputLogFunc = (input: any) => {
            getLogger().info({
                category: 'Nimbus',
                ...(input?.data?.correlationId && {
                    correlationId: input.data.correlationId,
                }),
                message:
                    `${input?.data?.correlationId} - [Query] ${input?.type} from ${input?.source}`,
            });
        };

        super.get(path, async (ctx: Context) => {
            try {
                const correlationId = ctx.state.correlationId ?? ulid();
                const pathParams = (ctx as any).params;

                const queryParams: Record<string, string> = {};
                for (
                    const [key, value] of ctx.request.url.searchParams.entries()
                ) {
                    queryParams[key] = value;
                }

                const nimbusRouter = createRouter({
                    handlerMap: {
                        [queryType]: {
                            handler,
                            inputType: querySchema,
                        },
                    },
                    inputLogFunc,
                });

                const result = await nimbusRouter({
                    specversion: '1.0',
                    id: correlationId,
                    source: ctx.request.url.toString(),
                    type: queryType,
                    data: {
                        correlationId: correlationId,
                        payload: {
                            ...queryParams,
                            ...pathParams,
                        },
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
    }
}
