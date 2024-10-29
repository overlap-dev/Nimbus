import type { AuthContext, Router } from '@ovl-nimbus/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';

type CreateCommandHandlerInput = {
    commandRouter: Router;
    authContextGenerator: (
        request: FastifyRequest,
    ) => Promise<AuthContext<Record<string, any>>>;
};

/**
 * Creates a commandHandler function that can be used as a Fastify request handler.
 * The commandHandler works as an adapter between the Fastify API
 * and a Nimbus command router.
 */
export const createCommandHandler = ({
    commandRouter,
    authContextGenerator,
}: CreateCommandHandlerInput) => {
    // TODO: change inputs to be an object
    /**
     * The commandHandler is a Fastify request handler
     * that works as an adapter between the Fastify API and the Nimbus command router.
     *
     * @param request - Fastify request
     * @param reply - Fastify reply
     */
    const commandHandler = async (
        request: FastifyRequest<{
            Body: {
                name: string;
                domain: string;
                version: number;
                correlationId: string;
                data: Record<string, any>;
            };
        }>,
        reply: FastifyReply,
    ) => {
        const command = {
            name: request.body.name,
            data: request.body.data,
            metadata: {
                domain: request.body.domain,
                version: request.body.version,
                correlationId: request.body.correlationId,
                ...(authContextGenerator && {
                    authContext: await authContextGenerator(request),
                }),
            },
        };

        pipe(
            await commandRouter(command),
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

    return commandHandler;
};
