import type { Router } from '@nimbus/core';
import type { Context } from '@oak/oak/context';
import { getLogger } from '@std/log/get-logger';

export type CreateOakRouterAdapterInput = {
    nimbusRouter: Router;
    onError?: (error: any, context: Context) => void;
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
    onError,
}: CreateOakRouterAdapterInput): OakRouterAdapter => {
    const oakRouterAdapter: OakRouterAdapter = async ({
        input,
        context,
    }) => {
        try {
            const result = await nimbusRouter(input);

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
        } catch (error: any) {
            if (onError) {
                onError(error, context);
            } else {
                getLogger('Nimbus').error(error);

                const statusCode = error.statusCode ?? 500;
                context.response.status = statusCode;

                if (statusCode < 500) {
                    context.response.body = {
                        statusCode,
                        ...(error.details ? { code: error.name } : {}),
                        ...(error.message ? { message: error.message } : {}),
                        ...(error.details ? { details: error.details } : {}),
                    };
                } else {
                    context.response.body = {
                        message: 'Internal server error',
                    };
                }
            }
        }
    };

    return oakRouterAdapter;
};
