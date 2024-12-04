import { type Event, GenericException } from '@nimbus/core';
import EventEmitter from 'node:events';

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

    public onEvent(
        eventName: string,
        handler: (event: Event<string, any, any>) => Promise<void> | void,
        options?: NimbusEventBusOptions,
    ): Promise<void> {
        const maxRetries = options?.maxRetries ?? this._maxRetries;
        const retryDelay = options?.retryDelay ?? this._retryDelay;

        return new Promise<void>((resolve, reject) => {
            const handleEvent = async (event: Event<string, any, any>) => {
                let attempt = -1;

                while (attempt < maxRetries) {
                    try {
                        await handler(event);
                        break;
                    } catch (error: any) {
                        attempt++;

                        if (attempt >= maxRetries) {
                            const exception = new GenericException(
                                `Failed to handle ${eventName} event`,
                                {
                                    retryAttempts: maxRetries,
                                    retryDelay: retryDelay,
                                },
                            );

                            if (error.stack) {
                                exception.stack = error.stack;
                            }

                            reject(exception);
                        }

                        await new Promise((resolve) =>
                            setTimeout(resolve, retryDelay)
                        );
                    }
                }

                resolve();
            };

            this._eventEmitter.on(eventName, handleEvent);
        });
    }

    public putEvent<TEvent extends Event<string, any, any>>(event: TEvent) {
        this._eventEmitter.emit(event.name, event);
    }
}
