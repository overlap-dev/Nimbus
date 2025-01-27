import {
    createRouter,
    type Event,
    GenericException,
    type RouteHandler,
    type Router,
} from '@nimbus/core';
import * as log from '@std/log';
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
 *     'ACCOUNT_ADDED',
 *     AccountAddedEvent,
 *     accountAddedHandler,
 * );
 *
 * eventBus.putEvent<AccountAddedEvent>({
 *     name: 'ACCOUNT_ADDED',
 *     data: {
 *         account: account,
 *     },
 *     metadata: {
 *         correlationId: command.metadata.correlationId,
 *         authContext: command.metadata.authContext,
 *     },
 * });
 * ```
 */
export class NimbusEventBus {
    private _eventEmitter: EventEmitter;
    private _maxRetries: number;
    private _retryDelay: number;

    constructor(options?: NimbusEventBusOptions) {
        this._eventEmitter = new EventEmitter();

        this._maxRetries = options?.maxRetries ?? 2;
        this._retryDelay = options?.retryDelay ?? 1000;
    }

    /**
     * Publish an event to the event bus.
     *
     * @param event - The event to send to the event bus.
     */
    public putEvent<TEvent extends Event<string, any, any>>(
        event: TEvent,
    ): void {
        this._eventEmitter.emit(event.name, event);
    }

    /**
     * Subscribe to an event.
     *
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {ZodType} eventType - The ZodType of the event to subscribe to.
     * @param {RouteHandler} handler - The handler to call when the event got published.
     * @param {Function} [onError] - The function to call when the event could not be handled after the maximum number of retries.
     * @param {NimbusEventBusOptions} [options] - The options for the event bus.
     * @param {number} [options.maxRetries] - The maximum number of retries for handling the event in case of an error.
     * @param {number} [options.retryDelay] - The delay between retries in milliseconds.
     */
    public subscribeEvent(
        eventName: string,
        eventType: ZodType,
        handler: RouteHandler,
        onError?: (error: any, event: Event<string, any, any>) => void,
        options?: NimbusEventBusOptions,
    ): void {
        log.info({ msg: `Subscribed to ${eventName} event` });

        const maxRetries = options?.maxRetries ?? this._maxRetries;
        const retryDelay = options?.retryDelay ?? this._retryDelay;

        const nimbusRouter = createRouter({
            handlerMap: {
                [eventName]: {
                    handler,
                    inputType: eventType,
                },
            },
            inputLogFunc: this._logInput,
        });

        const handleEvent = async (event: Event<string, any, any>) => {
            try {
                await this._processEvent(
                    nimbusRouter,
                    event,
                    maxRetries,
                    retryDelay,
                );
            } catch (error) {
                if (onError) {
                    onError(error, event);
                } else {
                    log.error(error);
                }
            }
        };

        this._eventEmitter.on(eventName, handleEvent);
    }

    private _logInput(input: any) {
        log.getLogger('Nimbus').info({
            msg: `:: ${input?.metadata?.correlationId} - [Event] ${input?.name}`,
        });
    }

    private async _processEvent(
        nimbusRouter: Router,
        event: Event<string, any, any>,
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
                        `Failed to handle event: ${event.name}`,
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
