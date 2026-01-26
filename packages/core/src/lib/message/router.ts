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
    /**
     * Optional callback invoked when a message is received for routing.
     * Useful for custom logging or debugging of incoming messages.
     *
     * @param input - The incoming message to be routed.
     */
    logInput?: (input: any) => void;
    /**
     * Optional callback invoked after a message has been successfully handled.
     * Useful for custom logging or debugging of handler results.
     *
     * @param output - The result returned by the message handler.
     */
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
 * The MessageRouter routes messages to their handlers based on the type value of the message.
 *
 * Messages are validated against their registered Zod schemas before being passed to handlers.
 * All routing operations are instrumented with OpenTelemetry tracing and metrics for observability.
 *
 * @example
 * ```ts
 * import { createCommand, MessageRouter } from '@nimbus/core';
 *
 * const messageRouter = new MessageRouter({
 *     name: 'api',
 *     logInput: (input) => {
 *         console.log('Received message:', input.type);
 *     },
 *     logOutput: (output) => {
 *         console.log('Handler result:', output);
 *     },
 * });
 *
 * // Register command handler
 * messageRouter.register(
 *     'at.overlap.nimbus.create-order',
 *     createOrderHandler,
 *     createOrderCommandSchema,
 * );
 *
 * // Register query handler
 * messageRouter.register(
 *     'at.overlap.nimbus.get-order',
 *     getOrderHandler,
 *     getOrderQuerySchema,
 * );
 *
 * // Route a command
 * const command = createCommand({
 *     type: 'at.overlap.nimbus.create-order',
 *     source: 'https://api.example.com',
 *     data: { customerId: '123', items: ['item-1', 'item-2'] },
 * });
 *
 * const result = await messageRouter.route(command);
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
     * @param messageType - The message type as defined in the CloudEvents specification
     *                      (e.g., 'at.overlap.nimbus.create-order').
     * @param handler - The async handler function that processes the message and returns a result.
     * @param schema - The Zod schema to validate the incoming message before passing to the handler.
     *
     * @example
     * ```ts
     * import { commandSchema, type Command, getRouter } from '@nimbus/core';
     * import { z } from 'zod';
     *
     * // Define the command type and schema
     * const CREATE_ORDER_TYPE = 'at.overlap.nimbus.create-order';
     *
     * const createOrderSchema = commandSchema.extend({
     *     type: z.literal(CREATE_ORDER_TYPE),
     *     data: z.object({
     *         customerId: z.string(),
     *         items: z.array(z.string()),
     *     }),
     * });
     * type CreateOrderCommand = z.infer<typeof createOrderSchema>;
     *
     * // Define the handler
     * const createOrderHandler = async (command: CreateOrderCommand) => {
     *     // Process the command and return the result
     *     return { orderId: '12345', status: 'created' };
     * };
     *
     * // Register the handler
     * const router = getRouter('default');
     * router.register(CREATE_ORDER_TYPE, createOrderHandler, createOrderSchema);
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
     * The message is validated against the registered schema before being passed to the handler.
     * The routing operation is instrumented with OpenTelemetry tracing and metrics.
     *
     * @param input - The CloudEvents-compliant message to route (command, query, or event).
     * @returns The result from the handler.
     *
     * @throws {NotFoundException} If no handler is registered for the message type.
     * @throws {InvalidInputException} If the message has no type attribute or fails schema validation.
     *
     * @example
     * ```ts
     * import { createCommand, getRouter } from '@nimbus/core';
     *
     * const router = getRouter('default');
     *
     * // Create a command with all CloudEvents properties
     * const command = createCommand({
     *     type: 'at.overlap.nimbus.create-order',
     *     source: 'https://api.example.com',
     *     correlationid: '550e8400-e29b-41d4-a716-446655440000',
     *     data: {
     *         customerId: '123',
     *         items: ['item-1', 'item-2'],
     *     },
     *     datacontenttype: 'application/json',
     * });
     *
     * // Route the command to its registered handler
     * const result = await router.route(command);
     * console.log('Order created:', result);
     * ```
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
                        ).fromZodError(validationResult.error);
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
 * @param options.logInput - Optional callback invoked when a message is received for routing.
 * @param options.logOutput - Optional callback invoked after a message has been successfully handled.
 *
 * @example
 * ```ts
 * import { getLogger, setupRouter } from '@nimbus/core';
 *
 * // At application startup, configure the router with all options
 * setupRouter('default', {
 *     logInput: (input) => {
 *         getLogger().debug({
 *             category: 'Router',
 *             message: 'Received message',
 *             data: { type: input.type, correlationId: input.correlationid },
 *             correlationId: input.correlationid,
 *         });
 *     },
 *     logOutput: (output) => {
 *         getLogger().debug({
 *             category: 'Router',
 *             message: 'Handler completed',
 *             data: { output },
 *         });
 *     },
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
 * import { createCommand, getRouter } from '@nimbus/core';
 *
 * // Get the router configured earlier with setupRouter
 * const router = getRouter('default');
 *
 * // Register handlers
 * router.register(
 *     'at.overlap.nimbus.create-order',
 *     createOrderHandler,
 *     createOrderSchema,
 * );
 *
 * // Route a message
 * const command = createCommand({
 *     type: 'at.overlap.nimbus.create-order',
 *     source: 'https://api.example.com',
 *     correlationid: '550e8400-e29b-41d4-a716-446655440000',
 *     data: { customerId: '123', items: ['item-1'] },
 *     datacontenttype: 'application/json',
 * });
 *
 * const result = await router.route(command);
 * ```
 */
export const getRouter = (name: string = 'default'): MessageRouter => {
    let router = routerRegistry.get(name);

    if (!router) {
        router = new MessageRouter({ name });
        routerRegistry.set(name, router);
    }

    return router;
};
