import * as E from '@baetheus/fun/either';
import { getLogger } from '@std/log';
import { ZodError, type ZodType } from 'zod';
import type { Exception } from '../exception/exception.ts';
import { GenericException } from '../exception/genericException.ts';
import { InvalidInputException } from '../exception/invalidInputException.ts';
import { NotFoundException } from '../exception/notFoundException.ts';

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

export type Router = (
    input: any,
) => Promise<E.Either<Exception, RouteHandlerResult>>;

export type CreateRouterInput = {
    handlerMap: RouteHandlerMap;
};

/**
 * Creates a router that routes events, commands or queries to the appropriate handler.
 *
 * @param CreateRouterInput - The input to create the router.
 * @returns Router
 */
export const createRouter = ({
    handlerMap,
}: CreateRouterInput): Router => {
    // TODO: Do we need middleware support, and would this be the place to add it?

    const logger = getLogger('nimbus-logger');

    const router: Router = (input) => {
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

            return Promise.resolve(E.left(notFoundException));
        }

        const { handler, inputType } = handlerMap[input.name];

        try {
            const validInput = inputType.parse(input);

            return handler(validInput);
        } catch (error) {
            if (error instanceof ZodError) {
                const invalidInputException = new InvalidInputException()
                    .fromZodError(error);

                logger.info({
                    msg: 'Nimbus Router :: invalid input',
                    exception: invalidInputException,
                });

                return Promise.resolve(E.left(invalidInputException));
            } else {
                const genericException = new GenericException().fromError(
                    error as Error,
                );

                logger.error({
                    msg: 'Nimbus Router :: error catched',
                    exception: genericException,
                });

                return Promise.resolve(E.left(genericException));
            }
        }
    };

    return router;
};
