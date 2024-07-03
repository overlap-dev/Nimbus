import * as E from 'fp-ts/Either';
import { Logger } from 'pino';
import { ZodError, ZodType } from 'zod';
import { Exception } from '../exception/exception';
import { GenericException } from '../exception/genericException';
import { InvalidInputException } from '../exception/invalidInputException';
import { NotFoundException } from '../exception/notFoundException';

export type RouteHandlerResult<TData = unknown> = {
    statusCode: number;
    headers?: Record<string, string>;
    data: TData;
};

export type RouteHandler<TInput = any, TResultData = any> = (
    input: TInput,
) => Promise<E.Either<Exception, RouteHandlerResult<TResultData>>>;

export type RouteHandlerMap = Record<
    string,
    {
        handler: RouteHandler;
        inputType: ZodType;
    }
>;

export type Router = (input: any) => Promise<E.Either<Exception, unknown>>;

export type CreateRouterInput = {
    handlerMap: RouteHandlerMap;
    logger: Logger;
};

/**
 * Creates a router that routes events, commands or queries to the appropriate handler.
 *
 * @param CreateRouterInput - The input to create the router.
 * @returns Router
 */
export const createRouter = ({
    handlerMap,
    logger,
}: CreateRouterInput): Router => {
    // TODO: Do we need middleware support, and would this be the place to add it?

    const router: Router = async (input) => {
        logger.debug({ msg: 'Nimbus Router :: received input', input });

        if (!handlerMap[input.name]) {
            const notFoundException = new NotFoundException(
                'Route handler not found',
                {
                    reason: `Could not find a handler for "${input.name}"`,
                },
            );

            logger.info({
                msg: 'Nimbus Router :: handler not found',
                exception: notFoundException,
            });
            return E.left(notFoundException);
        }

        const { handler, inputType } = handlerMap[input.name];

        try {
            const validInput = inputType.parse(input);

            return handler(validInput);
        } catch (error) {
            if (error instanceof ZodError) {
                const invalidInputException =
                    new InvalidInputException().fromZodError(error);

                logger.info({
                    msg: 'Nimbus Router :: invalid input',
                    exception: invalidInputException,
                });
                return E.left(invalidInputException);
            } else {
                const genericException = new GenericException().fromError(
                    error as Error,
                );

                logger.error({
                    msg: 'Nimbus Router :: error catched',
                    exception: genericException,
                });
                return E.left(genericException);
            }
        }
    };

    return router;
};
