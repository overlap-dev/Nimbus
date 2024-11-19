import { type AuthContext, Exception, type Router } from '@nimbus/core';
import { ulid } from '@std/ulid';
import type { FastifyReply, FastifyRequest } from 'fastify';

type CreateQueryHandlerInput = {
    queryRouter: Router;
    authContextGenerator: (
        request: FastifyRequest,
    ) => Promise<AuthContext<Record<string, any>>>;
    onError?: (error: any) => void;
};

/**
 * Creates a queryHandler function that can be used as a Fastify request handler.
 * The queryHandler works as an adapter between the Fastify API
 * and a Nimbus query router.
 */
export const createQueryHandler = ({
    queryRouter,
    authContextGenerator,
    onError,
}: CreateQueryHandlerInput) => {
    // TODO: change inputs to be an object
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

        try {
            const result = await queryRouter(query);
            reply.code(result.statusCode);

            if (result.headers) {
                reply.headers(result.headers);
            }

            reply.send(result.data);
        } catch (error: any) {
            if (onError) {
                onError(error);
            } else {
                if (error instanceof Exception) {
                    const statusCode = error.statusCode || 500;

                    reply.code(statusCode).send({
                        statusCode,
                        code: error.name,
                        message: error.message,
                        ...(error.details ? { details: error.details } : {}),
                    });
                } else {
                    reply.code(500).send();
                }
            }
        }
    };

    return queryHandler;
};
