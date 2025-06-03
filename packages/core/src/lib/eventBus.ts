import {
    type CloudEvent,
    createRouter,
    GenericException,
    getLogger,
    type RouteHandler,
    type Router,
} from '@nimbus/core';
import EventEmitter from 'node:events';
import type { ZodType } from 'zod';

export type NimbusEventBusOptions = {
    maxRetries?: number;
    retryDelay?: number;
};

/**
 * The NimbusEventBus is used to publish and
 * subscribe to events within the application.
 *
 * @example
 * ```ts
 * export const eventBus = new NimbusEventBus({
 *     maxRetries: 3,
 *     retryDelay: 3000,
 * });
 *
 * eventBus.subscribeEvent(
 *     'account.added',
 *     AccountAddedEvent,
 *     accountAddedHandler,
 * );
 *
 * eventBus.putEvent<AccountAddedEvent>({
 *     specversion: '1.0',
 *     id: '123',
 *     source: 'https://nimbus.overlap.at/api/account/add',
 *     type: 'account.added',
 *     data: {
 *         correlationId: command.metadata.correlationId,
 *         payload: { account: account },
 *     },
 * });
 * ```
 */
export class NimbusEventBus {
    private _eventEmitter: EventEmitter;
    private _maxRetries: number;
    private _retryDelay: number;

    /**
     * Create a new NimbusEventBus instance.
     *
     * @param {NimbusEventBusOptions} [options] - The options for the event bus.
     * @param {number} [options.maxRetries] - The maximum number of retries for handling the event in case of an error.
     * @param {number} [options.retryDelay] - The delay between retries in milliseconds.
     *
     * @example
     * ```ts
     * const eventBus = new NimbusEventBus({
     *     maxRetries: 3,
     *     retryDelay: 3000,
     * });
     * ```
     */
    constructor(options?: NimbusEventBusOptions) {
        this._eventEmitter = new EventEmitter();

        this._maxRetries = options?.maxRetries ?? 2;
        this._retryDelay = options?.retryDelay ?? 1000;
    }

    /**
     * Publish an event to the event bus.
     *
     * @param event - The event to send to the event bus.
     *
     * @example
     * ```ts
     * eventBus.putEvent<AccountAddedEvent>({
     *     specversion: '1.0',
     *     id: '123',
     *     source: 'https://nimbus.overlap.at/api/account/add',
     *     type: 'account.added',
     *     data: {
     *         correlationId: command.metadata.correlationId,
     *         payload: { account: account },
     *     },
     * });
     * ```
     */
    public putEvent<TEvent extends CloudEvent<string, any>>(
        event: TEvent,
    ): void {
        this._eventEmitter.emit(event.type, event);
    }

    /**
     * Subscribe to an event.
     *
     * @param {string} eventType - The type of event to subscribe to.
     * @param {ZodType} eventSchema - The schema used for validation of the event to subscribe to.
     * @param {RouteHandler} handler - The handler to call when the event got published.
     * @param {Function} [onError] - The function to call when the event could not be handled after the maximum number of retries.
     * @param {NimbusEventBusOptions} [options] - The options for the event bus.
     * @param {number} [options.maxRetries] - The maximum number of retries for handling the event in case of an error.
     * @param {number} [options.retryDelay] - The delay between retries in milliseconds.
     *
     * @example
     * ```ts
     * eventBus.subscribeEvent(
     *     'account.added',
     *     AccountAddedEvent,
     *     accountAddedHandler,
     * );
     * ```
     */
    public subscribeEvent(
        eventType: string,
        eventSchema: ZodType,
        handler: RouteHandler,
        onError?: (error: any, event: CloudEvent<string, any>) => void,
        options?: NimbusEventBusOptions,
    ): void {
        getLogger().info({
            category: 'Nimbus',
            message: `Subscribed to ${eventType} event`,
        });

        const maxRetries = options?.maxRetries ?? this._maxRetries;
        const retryDelay = options?.retryDelay ?? this._retryDelay;

        const nimbusRouter = createRouter({
            handlerMap: {
                [eventType]: {
                    handler,
                    inputType: eventSchema,
                },
            },
            inputLogFunc: this._logInput,
        });

        const handleEvent = async (event: CloudEvent<string, any>) => {
            try {
                await this._processEvent(
                    nimbusRouter,
                    event,
                    maxRetries,
                    retryDelay,
                );
            } catch (error: any) {
                if (onError) {
                    onError(error, event);
                } else {
                    getLogger().error({
                        category: 'Nimbus',
                        message: error.message,
                        error,
                    });
                }
            }
        };

        this._eventEmitter.on(eventType, handleEvent);
    }

    private _logInput(input: any) {
        getLogger().info({
            category: 'Nimbus',
            ...(input?.data?.correlationId && {
                correlationId: input?.data?.correlationId,
            }),
            message: `[Event] ${input?.type} from ${input?.source}`,
        });
    }

    private async _processEvent(
        nimbusRouter: Router,
        event: CloudEvent<string, any>,
        maxRetries: number,
        retryDelay: number,
    ) {
        let attempt = -1;

        while (attempt < maxRetries) {
            try {
                await nimbusRouter(event);
                break;
            } catch (error: any) {
                attempt++;

                if (attempt >= maxRetries) {
                    const exception = new GenericException(
                        `Failed to handle event: ${event.type} from ${event.source}`,
                        {
                            retryAttempts: maxRetries,
                            retryDelay: retryDelay,
                        },
                    );

                    if (error.stack) {
                        exception.stack = error.stack;
                    }

                    throw exception;
                }

                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
    }
}
