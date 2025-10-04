import {
    type Command,
    createRouter,
    getLogger,
    type Query,
    type RouteHandler,
    type RouteHandlerResult,
} from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import { Router as OakRouter, type RouterOptions } from '@oak/oak/router';

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
     * @param {RouteHandler} handler - Nimbus Route Handler function
     * @param {AnySchema} commandSchema - JSON Schema of the command
     * @param {Function} onError - Optional function to customize error handling
     */
    command<TInput extends Command = Command, TOutput = unknown>({
        path,
        type,
        handler,
        allowUnsafeInput,
        onError,
    }: {
        path: string;
        type: string;
        handler: RouteHandler<TInput, TOutput>;
        allowUnsafeInput?: boolean;
        onError?: (error: any, ctx: Context) => void;
    }) {
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
                const requestBody = await ctx.request.body.json();

                const nimbusRouter = createRouter({
                    type: 'command',
                    handlerMap: {
                        [type]: {
                            handler,
                            allowUnsafeInput: allowUnsafeInput ?? false,
                        },
                    },
                    inputLogFunc,
                });

                // TODO: How do we implement the authentication context?
                // data: {
                //     ...(ctx.state.authContext && {
                //         authContext: ctx.state.authContext,
                //     }),
                // },

                const result = await nimbusRouter(requestBody);

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
     * @param {boolean} allowUnsafeInput - Allow unsafe input
     * @param {RouteHandler} handler - Nimbus Route Handler function
     * @param {Function} onError - Optional function to customize error handling
     */
    query<TInput extends Query = Query, TOutput = unknown>({
        path,
        type,
        allowUnsafeInput,
        handler,
        onError,
    }: {
        path: string;
        type: string;
        handler: RouteHandler<TInput, TOutput>;
        allowUnsafeInput?: boolean;
        onError?: (error: any, ctx: Context) => void;
    }) {
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

        super.post(path, async (ctx: Context) => {
            try {
                const requestBody = await ctx.request.body.json();

                const nimbusRouter = createRouter({
                    type: 'query',
                    handlerMap: {
                        [type]: {
                            handler,
                            allowUnsafeInput: allowUnsafeInput ?? false,
                        },
                    },
                    inputLogFunc,
                });

                // TODO: How do we implement the authentication context?
                // data: {
                //     ...(ctx.state.authContext && {
                //         authContext: ctx.state.authContext,
                //     }),
                // },

                const result = await nimbusRouter(requestBody);

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
