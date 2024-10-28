import { AuthContext, Router } from '@ovl-nimbus/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import { ulid } from 'ulid';

type CreateQueryHandlerInput = {
    queryRouter: Router;
    authContextGenerator: (
        request: FastifyRequest,
    ) => Promise<AuthContext<Record<string, any>>>;
};

/**
 * Creates a queryHandler function that can be used as a Fastify request handler.
 * The queryHandler works as an adapter between the Fastify API
 * and a Nimbus query router.
 */
export const createQueryHandler = ({
    queryRouter,
    authContextGenerator,
}: CreateQueryHandlerInput) => {
    /**
     * The queryHandler is a Fastify request handler
     * that works as an adapter between the Fastify API
     * and a Nimbus query router.
     *
     * @param queryName - Name of the query
     * @param domain - Domain the query belongs to
     * @param version - Version of the query
     * @param params - Parameters object aggregated from the requests path and search params
     * @param request - Fastify request
     * @param reply - Fastify reply
     */
    const queryHandler = async (
        queryName: string,
        domain: string,
        version: number,
        params: Record<string, any>,
        request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const correlationId = ulid();

        const query = {
            name: queryName,
            params: params,
            metadata: {
                domain: domain,
                version: version,
                correlationId: correlationId,
                ...(authContextGenerator && {
                    authContext: await authContextGenerator(request),
                }),
            },
        };

        pipe(
            await queryRouter(query),
            E.match(
                (exception) => {
                    reply.code(exception.statusCode || 500).send({
                        statusCode: exception.statusCode || 500,
                        code: exception.name,
                        message: exception.message,
                        ...(exception.details
                            ? { details: exception.details }
                            : {}),
                    });
                },
                (result) => {
                    reply.code(result.statusCode);

                    if (result.headers) {
                        reply.headers(result.headers);
                    }

                    reply.send(result.data);
                },
            ),
        );
    };

    return queryHandler;
};
