import { getLogger, InvalidInputException } from '@nimbus/core';
import type { z } from 'zod';
import { NotFoundException } from '../exception/notFoundException.ts';
import type { Message } from './message.ts';

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
    private readonly _logInput?: (input: any) => void;
    private readonly _logOutput?: (output: any) => void;

    constructor(
        options?: MessageRouterOptions,
    ) {
        this._handlers = new Map();
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

        return result;
    }
}
