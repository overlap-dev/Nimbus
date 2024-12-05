import { type AuthContext, Exception, type Router } from '@nimbus/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

type CreateCommandHandlerInput = {
    commandRouter: Router;
    authContextGenerator: (
        request: FastifyRequest,
    ) => Promise<AuthContext<Record<string, any>>>;
    onError?: (error: any) => void;
};

type CommandHandler = (
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
) => Promise<void>;

/**
 * Creates a commandHandler function that can be used as a Fastify request handler.
 * The commandHandler works as an adapter between the Fastify API
 * and a Nimbus command router.
 */
export const createCommandHandler = ({
    commandRouter,
    authContextGenerator,
    onError,
}: CreateCommandHandlerInput): CommandHandler => {
    // TODO: change inputs to be an object
    /**
     * The commandHandler is a Fastify request handler
     * that works as an adapter between the Fastify API and the Nimbus command router.
     *
     * @param request - Fastify request
     * @param reply - Fastify reply
     */
    const commandHandler: CommandHandler = async (request, reply) => {
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

        try {
            const result = await commandRouter(command);
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

    return commandHandler;
};
