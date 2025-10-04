import { getLogger, type MessageRouter } from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import { Router as OakRouter, type RouterOptions } from '@oak/oak/router';

/**
 * Options for handling errors in Oak routes.
 */
export type OakErrorHandlerOptions = {
    onError?: (error: any, ctx: Context) => void;
};

/**
 * Helper to create an Oak middleware that handles a Nimbus MessageRouter.
 * This bridges the MessageRouter (transport-agnostic) to Oak's HTTP context.
 *
 * @param {MessageRouter} router - The Nimbus MessageRouter instance
 * @param {OakErrorHandlerOptions} options - Optional options for error handling
 *
 * @returns {Function} The Oak middleware function
 */
export function createOakMessageHandler(
    router: MessageRouter,
    options?: OakErrorHandlerOptions,
): (ctx: Context) => Promise<void> {
    return async (ctx: Context) => {
        try {
            const requestBody = await ctx.request.body.json();
            const result = await router.route(requestBody);

            // Default HTTP response
            ctx.response.status = 200;
            ctx.response.body = result as any;
        } catch (error: any) {
            handleOakError(error, ctx, options?.onError);
        }
    };
}

/**
 * Default error handler for Oak routes that maps Nimbus exceptions to HTTP responses.
 *
 * @param {any} error - The error to handle.
 * @param {Context} ctx - The Oak context.
 * @param {Function} customHandler - Optional custom error handler.
 *
 * @returns {void}
 */
export function handleOakError(
    error: any,
    ctx: Context,
    customHandler?: (error: any, ctx: Context) => void,
): void {
    if (customHandler) {
        customHandler(error, ctx);
        return;
    }

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

/**
 * The NimbusOakRouter extends the Oak Router to provide
 * convenient methods for registering Nimbus message handlers.
 *
 * @example
 * ```ts
 * import { NimbusOakRouter } from "@nimbus/oak";
 *
 * const router = new NimbusOakRouter();
 * const commandRouter = new MessageRouter('command');
 *
 * commandRouter.register('at.overlap.nimbus.add-recipe', addRecipeHandler);
 *
 * router.command({
 *     path: '/command',
 *     router: commandRouter,
 * });
 * ```
 */
export class NimbusOakRouter extends OakRouter {
    constructor(opts: RouterOptions = {}) {
        super(opts);
    }

    /**
     * Routes POST requests to a Nimbus command router.
     *
     * @param {string} path - Oak request path
     * @param {MessageRouter} router - The Nimbus MessageRouter instance
     * @param {Function} onError - Optional function to customize error handling
     *
     * @example
     * ```ts
     * const commandRouter = new MessageRouter('command');
     * commandRouter.register('at.overlap.nimbus.add-recipe', addRecipeHandler);
     *
     * oakRouter.command({
     *     path: '/command',
     *     router: commandRouter,
     * });
     * ```
     */
    command({
        path,
        router,
        onError,
    }: {
        path: string;
        router: MessageRouter;
        onError?: (error: any, ctx: Context) => void;
    }) {
        super.post(path, createOakMessageHandler(router, { onError }));
    }

    /**
     * Routes POST requests to a Nimbus query router.
     *
     * @param {string} path - Oak request path
     * @param {MessageRouter} router - The Nimbus MessageRouter instance
     * @param {Function} onError - Optional function to customize error handling
     *
     * @example
     * ```ts
     * const queryRouter = new MessageRouter('query');
     * queryRouter.register('at.overlap.nimbus.get-recipe', getRecipeHandler);
     *
     * oakRouter.query({
     *     path: '/query',
     *     router: queryRouter,
     * });
     * ```
     */
    query({
        path,
        router,
        onError,
    }: {
        path: string;
        router: MessageRouter;
        onError?: (error: any, ctx: Context) => void;
    }) {
        super.post(path, createOakMessageHandler(router, { onError }));
    }
}
