import EventEmitter from 'node:events';
import { GenericException } from '../exception/genericException.ts';
import { getLogger } from '../log/logger.ts';
import type { Event } from '../message/event.ts';
import type { RouteHandler, Router } from '../router/router.ts';
import { createRouter } from '../router/router.ts';

/**
 * The input type for subscribing to an event.
 */
export type SubscribeEventInput = {
    type: string;
    handler: RouteHandler;
    allowUnsafeInput?: boolean;
    onError?: (error: any, event: Event) => void;
    options?: NimbusEventBusOptions;
};

/**
 * The type for the NimbusEventBus options.
 */
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
 * eventBus.subscribeEvent({
 *     type: 'at.overlap.nimbus.account-added',
 *     handler: accountAddedHandler,
 * });
 *
 * eventBus.putEvent<AccountAddedEvent>({
 *     specversion: '1.0',
 *     id: '123',
 *     correlationid: '456',
 *     time: '2025-01-01T00:00:00Z',
 *     source: 'https://nimbus.overlap.at',
 *     type: 'at.overlap.nimbus.account-added',
 *     data: {
 *         accountId: '123',
 *     },
 *     datacontenttype: 'application/json',
 *     dataschema: 'https://nimbus.overlap.at/schemas/events/account-added/v1',
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
     *     correlationid: '456',
     *     time: '2025-01-01T00:00:00Z',
     *     source: 'https://nimbus.overlap.at',
     *     type: 'at.overlap.nimbus.account-added',
     *     data: {
     *         accountId: '123',
     *     },
     *     datacontenttype: 'application/json',
     *     dataschema: 'https://nimbus.overlap.at/schemas/events/account-added/v1',
     * });
     * ```
     */
    public putEvent(event: Event): void {
        this._validateEventSize(event);

        this._eventEmitter.emit(event.type, event);
    }

    /**
     * Subscribe to an event.
     *
     * @param {string} eventType - The type of event to subscribe to.
     * @param {RouteHandler} handler - The handler to call when the event got published.
     * @param {Function} [onError] - The function to call when the event could not be handled after the maximum number of retries.
     * @param {NimbusEventBusOptions} [options] - The options for the event bus.
     * @param {number} [options.maxRetries] - The maximum number of retries for handling the event in case of an error.
     * @param {number} [options.retryDelay] - The delay between retries in milliseconds.
     *
     * @example
     * ```ts
     * eventBus.subscribeEvent({
     *     type: 'at.overlap.nimbus.account-added',
     *     handler: accountAddedHandler,
     *     allowUnsafeInput: true, // Disables input validation (not recommended)
     * });
     * ```
     */
    public subscribeEvent({
        type,
        handler,
        allowUnsafeInput,
        onError,
        options,
    }: SubscribeEventInput): void {
        getLogger().info({
            category: 'Nimbus',
            message: `Subscribed to ${type} event`,
        });

        const maxRetries = options?.maxRetries ?? this._maxRetries;
        const retryDelay = options?.retryDelay ?? this._retryDelay;

        const nimbusRouter = createRouter({
            type: 'event',
            handlerMap: {
                [type]: {
                    handler,
                    ...(allowUnsafeInput && { allowUnsafeInput }),
                },
            },
            inputLogFunc: this._logInput,
        });

        const handleEvent = async (event: Event) => {
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

        this._eventEmitter.on(type, handleEvent);
    }

    private _logInput(input: any) {
        getLogger().info({
            category: 'Nimbus',
            ...(input?.data?.correlationId && {
                correlationId: input?.data?.correlationId,
            }),
            message:
                `${input?.data?.correlationId} - [Event] ${input?.type} from ${input?.source}`,
        });
    }

    private async _processEvent(
        nimbusRouter: Router,
        event: Event,
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

    /**
     * Validate the size of the event.
     *
     * To comply with the CloudEvent spec a transmitted event
     * can only have a maximum size of 64KB.
     *
     * @param event - The event to validate.
     */
    private _validateEventSize(event: Event): void {
        const eventJson = JSON.stringify(event);
        const eventSizeBytes = new TextEncoder().encode(eventJson).length;
        const maxSizeBytes = 64 * 1024; // 64KB

        if (eventSizeBytes > maxSizeBytes) {
            throw new GenericException(
                `Event size exceeds the limit of 64KB`,
                {
                    eventType: event.type,
                    eventSource: event.source,
                    eventSizeBytes,
                    maxSizeBytes,
                },
            );
        }
    }
}
