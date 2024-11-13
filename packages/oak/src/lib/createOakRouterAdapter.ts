import * as E from '@baetheus/fun/either';
import { pipe } from '@baetheus/fun/fn';
import type { Router } from '@nimbus/core';
import type { Context } from '@oak/oak/context';

export type CreateOakRouterAdapterInput = {
    nimbusRouter: Router;
};

export type OakRouterAdapterInput = {
    input: any;
    context: Context;
};

export type OakRouterAdapter = (
    input: OakRouterAdapterInput,
) => Promise<void>;

/**
 * Creates an oakRouterAdapter to forward "@oak/oak" requests to a Nimbus router.
 *
 * @param nimbusRouter - Nimbus Router to forward requests to.
 */
export const createOakRouterAdapter = ({
    nimbusRouter,
}: CreateOakRouterAdapterInput): OakRouterAdapter => {
    const oakRouterAdapter: OakRouterAdapter = async ({
        input,
        context,
    }) => {
        pipe(
            await nimbusRouter(input),
            E.match(
                (exception) => {
                    context.response.status = exception.statusCode || 500;
                    context.response.body = {
                        statusCode: exception.statusCode || 500,
                        code: exception.name,
                        message: exception.message,
                        ...(exception.details
                            ? { details: exception.details }
                            : {}),
                    };
                },
                (result) => {
                    context.response.status = result.statusCode;

                    if (result.headers) {
                        for (const header of Object.keys(result.headers)) {
                            context.response.headers.set(
                                header,
                                result.headers[header],
                            );
                        }
                    }

                    context.response.body = result.data;
                },
            ),
        );
    };

    return oakRouterAdapter;
};
