import { metrics, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { z } from 'zod';
import { InvalidInputException } from '../exception/invalidInputException.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import { getLogger } from '../log/logger.ts';
import type { Message } from './message.ts';

const tracer = trace.getTracer('nimbus');
const meter = metrics.getMeter('nimbus');

const messagesRoutedCounter = meter.createCounter(
    'router_messages_routed_total',
    {
        description: 'Total number of messages routed',
    },
);

const routingDuration = meter.createHistogram(
    'router_routing_duration_seconds',
    {
        description: 'Duration of message routing in seconds',
        unit: 's',
    },
);

/**
 * The message handler type - transport-agnostic, just returns domain data.
 *
 * @template TInput - The type of the input message.
 * @template TOutput - The type of the data returned by the handler.
 */
export type MessageHandler<
    TInput extends Message = Message,
    TOutput = unknown,
> = (
    input: TInput,
) => Promise<TOutput>;

/**
 * Options for creating a MessageRouter.
 */
export type MessageRouterOptions = {
    /**
     * The name of the router instance for metrics and traces.
     * Defaults to 'default'.
     */
    name?: string;
    logInput?: (input: any) => void;
    logOutput?: (output: any) => void;
};

type ZodSchema<T = any> = z.ZodType<T>;

/**
 * Internal handler registration.
 */
type HandlerRegistration = {
    handler: MessageHandler<any, any>;
    schema: ZodSchema;
};

/**
 * The MessageRouter routes messages to their handlers
 * based on the type value of the message.
 *
 * @example
 * ```ts
 * import { MessageRouter } from "@nimbus/core";
 *
 * const messageRouter = new MessageRouter();
 *
 * messageRouter.register(
 *     'at.overlap.nimbus.add-recipe',
 *     addRecipeHandler,
 *     addRecipeSchema,
 * );
 *
 * messageRouter.register(
 *     'at.overlap.nimbus.recipe-added',
 *     recipeAddedHandler,
 *     recipeAddedSchema,
 * );
 *
 * messageRouter.register(
 *     'at.overlap.nimbus.get-recipe',
 *     getRecipeHandler,
 *     getRecipeSchema,
 * );
 *
 * const result = await messageRouter.route(someInput);
 * ```
 */
export class MessageRouter {
    private readonly _handlers: Map<string, HandlerRegistration>;
    private readonly _name: string;
    private readonly _logInput?: (input: any) => void;
    private readonly _logOutput?: (output: any) => void;

    constructor(
        options?: MessageRouterOptions,
    ) {
        this._handlers = new Map();
        this._name = options?.name ?? 'default';
        this._logInput = options?.logInput;
        this._logOutput = options?.logOutput;
    }

    /**
     * Register a handler for a specific message type.
     *
     * @param {string} messageType - The messages type as defined in the CloudEvents specification (e.g., 'at.overlap.nimbus.add-recipe')
     * @param {MessageHandler} handler - The handler function
     * @param {ZodSchema} schema - The schema to validate the command
     *
     * @example
     * ```ts
     * router.register(
     *     'at.overlap.nimbus.add-recipe',
     *     addRecipeHandler,
     *     addRecipeSchema,
     * );
     *
     * router.register(
     *     'at.overlap.nimbus.get-recipe',
     *     getRecipeHandler,
     *     getRecipeSchema,
     * );
     * ```
     */
    public register<TInput extends Message = Message, TOutput = unknown>(
        messageType: string,
        handler: MessageHandler<TInput, TOutput>,
        schema: ZodSchema,
    ): void {
        this._handlers.set(messageType, {
            handler,
            schema,
        });

        getLogger().debug({
            category: 'Nimbus',
            message: `Registered handler for: ${messageType}`,
        });
    }

    /**
     * Route a message to its handler.
     *
     * @param {unknown} input - The raw input to route
     *
     * @returns {Promise<unknown>} The result from the handler
     *
     * @throws {NotFoundException} - If no handler is registered for the message type
     * @throws {InvalidInputException} - If the message is invalid
     * @throws {GenericException} - If an error occurs during routing
     */
    public async route(input: any): Promise<unknown> {
        const startTime = performance.now();
        const messageType = input?.type ?? 'unknown';

        return await tracer.startActiveSpan(
            'router.route',
            {
                kind: SpanKind.INTERNAL,
                attributes: {
                    'messaging.system': 'nimbusRouter',
                    'messaging.router_name': this._name,
                    'messaging.operation': 'route',
                    'messaging.destination': messageType,
                    ...(input?.correlationid && {
                        correlation_id: input.correlationid,
                    }),
                },
            },
            async (span) => {
                try {
                    if (this._logInput) {
                        this._logInput(input);
                    }

                    if (!input?.type) {
                        throw new InvalidInputException(
                            'The provided input has no type attribute',
                        );
                    }

                    const registration = this._handlers.get(input.type);
                    if (!registration) {
                        throw new NotFoundException(
                            'Message handler not found',
                            {
                                reason:
                                    `Could not find a handler for message type: "${input.type}"`,
                            },
                        );
                    }

                    const { handler, schema } = registration;

                    const validationResult = schema.safeParse(input);

                    if (!validationResult.success) {
                        throw new InvalidInputException(
                            'The provided input is invalid',
                            {
                                issues: validationResult.error.issues,
                            },
                        );
                    }

                    const result = await handler(validationResult.data);

                    if (this._logOutput) {
                        this._logOutput(result);
                    }

                    messagesRoutedCounter.add(1, {
                        router_name: this._name,
                        message_type: input.type,
                        status: 'success',
                    });
                    routingDuration.record(
                        (performance.now() - startTime) / 1000,
                        { router_name: this._name, message_type: input.type },
                    );

                    return result;
                } catch (error: any) {
                    messagesRoutedCounter.add(1, {
                        router_name: this._name,
                        message_type: messageType,
                        status: 'error',
                    });
                    routingDuration.record(
                        (performance.now() - startTime) / 1000,
                        { router_name: this._name, message_type: messageType },
                    );

                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error instanceof Error
                            ? error.message
                            : 'Unknown error',
                    });
                    span.recordException(
                        error instanceof Error
                            ? error
                            : new Error('Unknown error'),
                    );

                    throw error;
                } finally {
                    span.end();
                }
            },
        );
    }
}

/**
 * Registry to store named MessageRouter instances.
 */
const routerRegistry = new Map<string, MessageRouter>();

/**
 * Setup a named MessageRouter instance and register it for later retrieval.
 *
 * Use this function to configure a MessageRouter with specific options at application
 * startup, then retrieve it later using {@link getRouter}.
 *
 * @param name - The unique name for this MessageRouter instance.
 * @param options - Optional configuration options for the MessageRouter.
 *
 * @example
 * ```ts
 * import { setupRouter } from '@nimbus/core';
 *
 * // At application startup
 * setupRouter('default', {
 *     logInput: (input) => console.log('Input:', input),
 *     logOutput: (output) => console.log('Output:', output),
 * });
 * ```
 */
export const setupRouter = (
    name: string,
    options?: Omit<MessageRouterOptions, 'name'>,
): void => {
    routerRegistry.set(name, new MessageRouter({ ...options, name }));
};

/**
 * Get a named MessageRouter instance.
 *
 * If a MessageRouter with the given name has been configured via {@link setupRouter},
 * that instance is returned. Otherwise, a new MessageRouter with default options is created
 * and registered.
 *
 * @param name - The name of the MessageRouter instance to retrieve. Defaults to 'default'.
 * @returns The MessageRouter instance.
 *
 * @example
 * ```ts
 * import { getRouter } from '@nimbus/core';
 *
 * // Get the default router (configured earlier with setupRouter)
 * const router = getRouter('default');
 *
 * router.register(
 *     'order.create',
 *     createOrderHandler,
 *     createOrderSchema,
 * );
 *
 * // Get the default router
 * const defaultRouter = getRouter();
 * ```
 */
export const getRouter = (name: string = 'default'): MessageRouter => {
    if (!routerRegistry.has(name)) {
        routerRegistry.set(name, new MessageRouter({ name }));
    }
    return routerRegistry.get(name)!;
};
