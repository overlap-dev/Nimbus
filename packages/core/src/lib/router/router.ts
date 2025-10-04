import { getLogger, InvalidInputException } from '@nimbus/core';
import { GenericException } from '../exception/genericException.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import { type Command, commandSchema } from '../message/command.ts';
import { type Event, eventSchema } from '../message/event.ts';
import type { Message } from '../message/message.ts';
import { type Query, querySchema } from '../message/query.ts';
import { getValidator } from '../validator/validator.ts';

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
 * Options for registering a message handler.
 */
export type RegisterHandlerOptions = {
    allowUnsafeInput?: boolean;
};

/**
 * Options for creating a MessageRouter.
 */
export type MessageRouterOptions = {
    logInput?: (input: unknown) => void;
    logOutput?: (output: unknown) => void;
};

/**
 * Internal handler registration.
 */
type HandlerRegistration = {
    handler: MessageHandler<any, any>;
    allowUnsafeInput: boolean;
};

/**
 * The MessageRouter routes messages to their handlers.
 *
 * @example
 * ```ts
 * import { MessageRouter } from "@nimbus/core";
 *
 * const commandRouter = new MessageRouter('command');
 *
 * commandRouter.register(
 *     'at.overlap.nimbus.add-recipe',
 *     addRecipeHandler,
 * );
 *
 * const result = await commandRouter.route(someCommand);
 * ```
 */
export class MessageRouter {
    private readonly _type: 'command' | 'query' | 'event';
    private readonly _handlers: Map<string, HandlerRegistration>;
    private readonly _logInput?: (input: unknown) => void;
    private readonly _logOutput?: (output: unknown) => void;

    constructor(
        type: 'command' | 'query' | 'event',
        options?: MessageRouterOptions,
    ) {
        this._type = type;
        this._handlers = new Map();
        this._logInput = options?.logInput;
        this._logOutput = options?.logOutput;
    }

    /**
     * Register a message handler for a specific message type.
     *
     * @param {string} messageType - The message type (e.g., 'at.overlap.nimbus.add-recipe')
     * @param {MessageHandler} handler - The handler function
     * @param {RegisterHandlerOptions} options - Optional configuration
     *
     * @example
     * ```ts
     * router.register(
     *     'at.overlap.nimbus.add-recipe',
     *     addRecipeHandler,
     *     { allowUnsafeInput: true }
     * );
     * ```
     */
    public register<TInput extends Message = Message, TOutput = unknown>(
        messageType: string,
        handler: MessageHandler<TInput, TOutput>,
        options?: RegisterHandlerOptions,
    ): void {
        this._handlers.set(messageType, {
            handler,
            allowUnsafeInput: options?.allowUnsafeInput ?? false,
        });

        getLogger().debug({
            category: 'Nimbus',
            message: `Registered ${this._type} handler for: ${messageType}`,
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
    public async route(input: unknown): Promise<unknown> {
        if (this._logInput) {
            this._logInput(input);
        }

        const validator = getValidator();

        // Validate message envelope
        let parseResult;
        if (this._type === 'command') {
            parseResult = validator.validate<Command>(commandSchema.$id, input);
        } else if (this._type === 'query') {
            parseResult = validator.validate<Query>(querySchema.$id, input);
        } else if (this._type === 'event') {
            parseResult = validator.validate<Event>(eventSchema.$id, input);
        } else {
            throw new GenericException(
                'Invalid router type',
                {
                    reason:
                        `The router type must be either "command", "query" or "event"`,
                },
            );
        }

        if (parseResult.error) {
            throw parseResult.error;
        }

        const message = parseResult.data;

        // Find handler
        const registration = this._handlers.get(message.type);
        if (!registration) {
            throw new NotFoundException(
                'Message handler not found',
                {
                    reason:
                        `Could not find a handler for message type: "${message.type}"`,
                },
            );
        }

        const { handler, allowUnsafeInput } = registration;

        // Validate message data if dataschema is provided
        let validMessage: Message;
        if (message.dataschema) {
            const { data, error } = validator.validate<Message>(
                message.dataschema,
                message,
            );

            if (error) {
                throw error;
            } else {
                validMessage = data;
            }
        } else {
            if (allowUnsafeInput) {
                getLogger().warn({
                    category: 'Nimbus',
                    message: 'No dataschema found for message',
                });
            } else {
                throw new InvalidInputException(
                    'No dataschema provided for message',
                    {
                        errorCode: 'MISSING_DATASCHEMA',
                        reason: `The dataschema is missing on the message
                            and "allowUnsafeInput" is not enabled for the message type.
                            It is recommended to always provide a dataschema
                            for input validation. Otherwise set "allowUnsafeInput"
                            to true when registering the handler.`,
                    },
                );
            }
            validMessage = message;
        }

        const result = await handler(validMessage);

        if (this._logOutput) {
            this._logOutput(result);
        }

        return result;
    }
}
