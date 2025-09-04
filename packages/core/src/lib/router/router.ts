import { getLogger, InvalidInputException } from '@nimbus/core';
import { GenericException } from '../exception/genericException.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import { type Command, commandSchema } from '../message/command.ts';
import { type Event, eventSchema } from '../message/event.ts';
import type { Message } from '../message/message.ts';
import { type Query, querySchema } from '../message/query.ts';
import { getValidator } from '../validator/validator.ts';

/**
 * The result type of a route handler.
 *
 * @template TData - The type of the data returned by the route handler.
 */
export type RouteHandlerResult<TData = unknown> = {
    statusCode: number;
    headers?: Record<string, string>;
    data?: TData;
};

/**
 * The route handler type.
 *
 * @template TInput - The type of the input to the route handler.
 * @template TOutputData - The type of the data returned by the route handler.
 */
export type RouteHandler<TInput = Message, TOutputData = unknown> = (
    input: TInput,
) => Promise<RouteHandlerResult<TOutputData>>;

/**
 * The RouteHandlerMap type.
 *
 * @template TInput - The type of the input to the route handler.
 * @template TOutputData - The type of the data returned by the route handler.
 */
export type RouteHandlerMap<TInput = Message> = Record<
    string,
    {
        handler: RouteHandler<TInput, any>;
        allowUnsafeInput?: boolean;
    }
>;

/**
 * The router type.
 *
 * @template TOutputData - The type of the data returned by the router.
 */
export type Router<TOutputData = unknown> = (
    input: unknown,
) => Promise<RouteHandlerResult<TOutputData>>;

/**
 * The input type for creating a Nimbus router.
 *
 * @template TInput - The type of the input to the router.
 * @template TResultData - The type of the data returned by the router.
 */
export type CreateRouterInput<TInput = Message> = {
    type: 'command' | 'query' | 'event';
    handlerMap: RouteHandlerMap<TInput>;
    inputLogFunc?: (input: unknown) => void;
};

/**
 * Creates a Nimbus router.
 *
 * @param {CreateRouterInput} input
 * @param {'command' | 'query' | 'event'} type - The type of input messages the router handles
 * @param {RouteHandlerMap} input.handlerMap - The map of route handlers.
 * @param {Function} input.inputLogFunc - Function to log input received by the router (optional).
 *
 * @returns {Router} The Nimbus router.
 *
 * @example
 * ```ts
 * import { createRouter } from "@nimbus/core";
 *
 * const commandRouter = createRouter({
 *     type: 'command',
 *     handlerMap: {
 *         'at.overlap.nimbus.get-account': {
 *             handler: getAccountHandler
 *         },
 *     },
 * });
 *
 * const queryRouter = createRouter({
 *     type: 'query',
 *     handlerMap: {
 *         'at.overlap.nimbus.get-account': {
 *             handler: getAccountHandler,
 *             allowUnsafeInput: true, // Disables input validation (not recommended)
 *         },
 *     },
 * });
 *
 * const eventRouter = createRouter({
 *     type: 'event',
 *     handlerMap: {
 *         'at.overlap.nimbus.account-added': {
 *             handler: accountAddedHandler,
 *         },
 *     },
 *     inputLogFunc: (input) => {
 *         getLogger().info({
 *             category: 'Events',
 *             message: `Received event: ${input.type}`,
 *         });
 *     },
 * });
 * ```
 */
export const createRouter = <TInput = Message>({
    type,
    handlerMap,
    inputLogFunc,
}: CreateRouterInput<TInput>): Router => {
    const validator = getValidator();

    /**
     * The Nimbus router takes unknown input,
     * validates the input and routes it to the appropriate handler.
     *
     * @param {unknown} input - The input to the router.
     *
     * @returns {Promise<RouteHandlerResult>} The result of the route handler.
     *
     * @throws {NotFoundException} - If the route handler is not found.
     * @throws {InvalidInputException} - If the input is invalid.
     * @throws {GenericException} - If an error occurs while handling the input.
     */
    const router: Router = (
        input: unknown,
    ): Promise<RouteHandlerResult> => {
        if (inputLogFunc) {
            inputLogFunc(input);
        }

        let parseResult;
        if (type === 'command') {
            parseResult = validator.validate<Command>(commandSchema.$id, input);
        } else if (type === 'query') {
            parseResult = validator.validate<Query>(querySchema.$id, input);
        } else if (type === 'event') {
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

        if (!handlerMap[message.type]) {
            throw new NotFoundException(
                'Route handler not found',
                {
                    reason:
                        `Could not find a handler for message type: "${message.type}"`,
                },
            );
        }

        const { handler, allowUnsafeInput } = handlerMap[message.type];

        let validMessage: TInput;
        if (message.dataschema) {
            const { data, error } = validator.validate<TInput>(
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
                            and "allowUnsafeInput" is not enabled to the message type.
                            It is recommended to always provide a dataschema
                            for input validation. Otherwise set "allowUnsafeInput"
                            to true for the route handler.`,
                    },
                );
            }
            validMessage = message as TInput;
        }

        return handler(validMessage);
    };

    return router;
};
