import * as E from '@baetheus/fun/either';
import { pipe } from '@baetheus/fun/fn';
import { getLogger } from '@std/log';
import EventEmitter from 'node:events';
import type { Exception } from '../exception/exception.ts';
import type { RouteHandlerResult } from '../router/index.ts';
import type { Router } from '../router/router.ts';
import type { Event } from './event.ts';

export type NimbusEventProcessorOnError = (
    event: Event<string, any, any>,
    exception: Exception,
) => Promise<void>;

export type NimbusEventProcessorOnSuccess = (
    event: Event<string, any, any>,
    result: RouteHandlerResult<any>,
) => Promise<void>;

export type NimbusEventProcessorOptions = {
    onError?: NimbusEventProcessorOnError;
    onSuccess?: NimbusEventProcessorOnSuccess;
};

export class NimbusEventProcessor extends EventEmitter {
    private _onError: NimbusEventProcessorOnError;
    private _onSuccess: NimbusEventProcessorOnSuccess;

    constructor(eventRouter: Router, options?: NimbusEventProcessorOptions) {
        super();

        if (options?.onSuccess) {
            this._onSuccess = options.onSuccess;
        } else {
            this._onSuccess = async () => {};
        }

        if (options?.onError) {
            this._onError = options.onError;
        } else {
            this._onError = (exception, event) => {
                getLogger('Nimbus').error({
                    msg: `Failed to handle ${event.name} event`,
                    exception,
                });

                return Promise.resolve();
            };
        }

        this.on('NimbusEvent', async (event: Event<string, any, any>) => {
            pipe(
                await eventRouter(event),
                E.match(
                    (exception) => {
                        this._onError(event, exception);
                    },
                    (result) => {
                        this._onSuccess(event, result);
                    },
                ),
            );
        });
    }

    public publishEvent(event: Event<string, any, any>) {
        this.emit('NimbusEvent', event);
    }
}
