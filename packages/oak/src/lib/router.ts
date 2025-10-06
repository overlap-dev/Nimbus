import {
    getLogger,
    type MessageRouter,
} from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import {
    Router as OakRouter,
    type RouterContext,
    type RouterOptions,
} from '@oak/oak/router';
import { ulid } from '@std/ulid';

/**
 * Options for handling errors in Oak routes.
 */
export type OakErrorHandlerOptions = {
    onError?: (error: any, ctx: Context) => void;
};

/**
 * Function to extract data from Oak RouterContext for a message.
 */
export type DataExtractor<TData = any> = (ctx: RouterContext<any>) => TData | Promise<TData>;

/**
 * Options for registering a command route.
 */
export type CommandRouteOptions<TData = any> = {
    path: string;
    messageType: string;
    router: MessageRouter;
    extractData?: DataExtractor<TData>;
    dataschema?: string;
    onError?: (error: any, ctx: Context) => void;
};

/**
 * Options for registering a query route.
 */
export type QueryRouteOptions<TData = any> = {
    path: string;
    messageType: string;
    router: MessageRouter;
    extractData: DataExtractor<TData>;
    dataschema?: string;
    onError?: (error: any, ctx: Context) => void;
};

/**
 * Default error handler for Oak routes that maps Nimbus exceptions to HTTP responses.
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
 * The NimbusOakRouter extends Oak Router to provide convenient methods
 * for routing HTTP requests to Nimbus MessageRouter handlers.
 *
 * It automatically constructs CloudEvents message envelopes from HTTP requests
 * and handles response mapping.
 *
 * @example
 * ```ts
 * import { NimbusOakRouter } from "@nimbus/oak";
 * import { MessageRouter } from "@nimbus/core";
 *
 * const queryRouter = new MessageRouter('query');
 * queryRouter.register('at.overlap.nimbus.get-recipe', getRecipeHandler);
 *
 * const commandRouter = new MessageRouter('command');
 * commandRouter.register('at.overlap.nimbus.add-recipe', addRecipeHandler);
 *
 * const httpRouter = new NimbusOakRouter();
 *
 * // Query route (GET)
 * httpRouter.query({
 *   path: '/recipes/:slug',
 *   messageType: 'at.overlap.nimbus.get-recipe',
 *   router: queryRouter,
 *   extractData: (ctx) => ({ slug: ctx.params.slug }),
 * });
 *
 * // Command route (POST)
 * httpRouter.command({
 *   path: '/recipes',
 *   messageType: 'at.overlap.nimbus.add-recipe',
 *   router: commandRouter,
 * });
 * ```
 */
export class NimbusOakRouter extends OakRouter {
    constructor(opts: RouterOptions = {}) {
        super(opts);
    }

    /**
     * Register a GET route that maps to a query message.
     *
     * Automatically constructs a Query CloudEvents message from the HTTP request
     * and routes it through the provided MessageRouter.
     *
     * @param options - Route configuration
     *
     * @example
     * ```ts
     * router.query({
     *   path: '/recipes/:slug',
     *   messageType: 'at.overlap.nimbus.get-recipe',
     *   router: queryRouter,
     *   extractData: (ctx) => ({ slug: ctx.params.slug }),
     * });
     * ```
     */
    query<TData = any>(options: QueryRouteOptions<TData>): void {
        super.get(options.path, async (ctx: RouterContext<any>) => {
            try {
                const data = await options.extractData(ctx);

                const query = {
                    specversion: '1.0' as const,
                    id: ulid(),
                    correlationid: ctx.state.correlationId ?? ulid(),
                    time: new Date().toISOString(),
                    source: ctx.request.url.origin,
                    type: options.messageType,
                    data,
                    datacontenttype: 'application/json' as const,
                    ...(options.dataschema && { dataschema: options.dataschema }),
                };

                const result = await options.router.route(query);

                ctx.response.status = 200;
                ctx.response.body = result as any;
            } catch (error: any) {
                handleOakError(error, ctx, options.onError);
            }
        });
    }

    /**
     * Register a POST route that maps to a command message.
     *
     * Automatically constructs a Command CloudEvents message from the HTTP request
     * and routes it through the provided MessageRouter.
     *
     * By default, extracts data from the request body as JSON.
     *
     * @param options - Route configuration
     *
     * @example
     * ```ts
     * // Using default body extraction
     * router.command({
     *   path: '/recipes',
     *   messageType: 'at.overlap.nimbus.add-recipe',
     *   router: commandRouter,
     * });
     *
     * // Custom data extraction
     * router.command({
     *   path: '/recipes/:slug',
     *   messageType: 'at.overlap.nimbus.update-recipe',
     *   router: commandRouter,
     *   extractData: async (ctx) => ({
     *     slug: ctx.params.slug,
     *     ...await ctx.request.body.json()
     *   }),
     * });
     * ```
     */
    command<TData = any>(options: CommandRouteOptions<TData>): void {
        const extractData = options.extractData ??
            (async (ctx: RouterContext<any>) => await ctx.request.body.json());

        super.post(options.path, async (ctx: RouterContext<any>) => {
            try {
                const data = await extractData(ctx);

                const command = {
                    specversion: '1.0' as const,
                    id: ulid(),
                    correlationid: ctx.state.correlationId ?? ulid(),
                    time: new Date().toISOString(),
                    source: ctx.request.url.origin,
                    type: options.messageType,
                    data,
                    datacontenttype: 'application/json' as const,
                    ...(options.dataschema && { dataschema: options.dataschema }),
                };

                const result = await options.router.route(command);

                ctx.response.status = 201;
                ctx.response.body = result as any;
            } catch (error: any) {
                handleOakError(error, ctx, options.onError);
            }
        });
    }

    /**
     * Register a PUT route that maps to a command message.
     *
     * Similar to command() but uses PUT method (for updates/replacements).
     *
     * @param options - Route configuration
     *
     * @example
     * ```ts
     * router.commandPut({
     *   path: '/recipes/:slug',
     *   messageType: 'at.overlap.nimbus.update-recipe',
     *   router: commandRouter,
     *   extractData: async (ctx) => ({
     *     slug: ctx.params.slug,
     *     ...await ctx.request.body.json()
     *   }),
     * });
     * ```
     */
    commandPut<TData = any>(options: CommandRouteOptions<TData>): void {
        const extractData = options.extractData ??
            (async (ctx: RouterContext<any>) => await ctx.request.body.json());

        super.put(options.path, async (ctx: RouterContext<any>) => {
            try {
                const data = await extractData(ctx);

                const command = {
                    specversion: '1.0' as const,
                    id: ulid(),
                    correlationid: ctx.state.correlationId ?? ulid(),
                    time: new Date().toISOString(),
                    source: ctx.request.url.origin,
                    type: options.messageType,
                    data,
                    datacontenttype: 'application/json' as const,
                    ...(options.dataschema && { dataschema: options.dataschema }),
                };

                const result = await options.router.route(command);

                ctx.response.status = 200;
                ctx.response.body = result as any;
            } catch (error: any) {
                handleOakError(error, ctx, options.onError);
            }
        });
    }

    /**
     * Register a DELETE route that maps to a command message.
     *
     * @param options - Route configuration
     *
     * @example
     * ```ts
     * router.commandDelete({
     *   path: '/recipes/:slug',
     *   messageType: 'at.overlap.nimbus.delete-recipe',
     *   router: commandRouter,
     *   extractData: (ctx) => ({ slug: ctx.params.slug }),
     * });
     * ```
     */
    commandDelete<TData = any>(options: CommandRouteOptions<TData>): void {
        const extractData = options.extractData ??
            ((ctx: RouterContext<any>) => ({ id: ctx.params.id }));

        super.delete(options.path, async (ctx: RouterContext<any>) => {
            try {
                const data = await extractData(ctx);

                const command = {
                    specversion: '1.0' as const,
                    id: ulid(),
                    correlationid: ctx.state.correlationId ?? ulid(),
                    time: new Date().toISOString(),
                    source: ctx.request.url.origin,
                    type: options.messageType,
                    data,
                    datacontenttype: 'application/json' as const,
                    ...(options.dataschema && { dataschema: options.dataschema }),
                };

                await options.router.route(command);

                ctx.response.status = 204;
            } catch (error: any) {
                handleOakError(error, ctx, options.onError);
            }
        });
    }
}
