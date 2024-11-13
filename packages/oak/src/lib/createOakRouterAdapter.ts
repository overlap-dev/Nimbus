import * as E from '@baetheus/fun/either';
import { pipe } from '@baetheus/fun/fn';
import type { Router } from '@nimbus/core';
import type { Context } from '@oak/oak/context';

export type CreateOakRouterAdapterInput = {
    nimbusRouter: Router;
};

export type OakRouterAdapterInput<TInput> = {
    input: TInput;
    context: Context;
};

/**
 * Creates a commandHandler function that can be used as a Fastify request handler.
 * The commandHandler works as an adapter between the Fastify API
 * and a Nimbus command router.
 */
export const createOakRouterAdapter = ({
    nimbusRouter,
}: CreateOakRouterAdapterInput) => {
    const oakRouterAdapter = async <TInput>({
        input,
        context,
    }: OakRouterAdapterInput<TInput>) => {
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
