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

export class NimbusEventBus {
    private _eventEmitter: EventEmitter;
    private _maxRetries: number;
    private _retryDelay: number;

    constructor(options?: NimbusEventBusOptions) {
        this._eventEmitter = new EventEmitter();

        this._maxRetries = options?.maxRetries ?? 2;
        this._retryDelay = options?.retryDelay ?? 1000;
    }

    public putEvent<TEvent extends Event<string, any, any>>(event: TEvent) {
        this._eventEmitter.emit(event.name, event);
    }

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
