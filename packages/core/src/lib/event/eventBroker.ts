import { getLogger } from '@std/log';
import EventEmitter from 'node:events';
import type { Exception } from '../exception/exception.ts';
import type { RouteHandlerResult } from '../router/index.ts';
import type { Router } from '../router/router.ts';
import type { Event } from './event.ts';

export type NimbusEventBrokerOnError = (
    event: Event<string, any, any>,
    exception: Exception,
) => Promise<void>;

export type NimbusEventBrokerOnSuccess = (
    event: Event<string, any, any>,
    result: RouteHandlerResult<any>,
) => Promise<void>;

export type NimbusEventBrokerOptions = {
    onError?: NimbusEventBrokerOnError;
    onSuccess?: NimbusEventBrokerOnSuccess;
};

/**
 * An event broker to which events can be published.
 * All events will be passed to the provided event router.
 *
 * @param eventRouter - Nimbus Router to which the event will be passed
 * @param options
 */
export class NimbusEventBroker extends EventEmitter {
    private _onError: NimbusEventBrokerOnError;
    private _onSuccess: NimbusEventBrokerOnSuccess;

    constructor(eventRouter: Router, options?: NimbusEventBrokerOptions) {
        super();

        if (options?.onSuccess) {
            this._onSuccess = options.onSuccess;
        } else {
            this._onSuccess = async () => {};
        }

        if (options?.onError) {
            this._onError = options.onError;
        } else {
            this._onError = (event, exception) => {
                getLogger('Nimbus').error({
                    msg: `Failed to handle ${event.name} event`,
                    exception,
                });

                return Promise.resolve();
            };
        }

        this.on('NimbusEventBroker', async (event: Event<string, any, any>) => {
            try {
                const result = await eventRouter(event);
                this._onSuccess(event, result);
            } catch (error: any) {
                this._onError(event, error);
            }
        });
    }

    public publishEvent<TEvent extends Event<string, any, any>>(event: TEvent) {
        this.emit('NimbusEventBroker', event);
    }
}
