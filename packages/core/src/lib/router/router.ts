import { ZodError, type ZodType } from 'zod';
import { GenericException } from '../exception/genericException.ts';
import { InvalidInputException } from '../exception/invalidInputException.ts';
import { NotFoundException } from '../exception/notFoundException.ts';

export type RouteHandlerResult<TData = any> = {
    statusCode: number;
    headers?: Record<string, string>;
    data: TData;
};

export type RouteHandler<TInput = any, TResultData = any> = (
    input: TInput,
) => Promise<RouteHandlerResult<TResultData>>;

export type RouteHandlerMap = Record<
    string,
    {
        handler: RouteHandler;
        inputType: ZodType;
    }
>;

export type Router = (
    input: any,
) => Promise<RouteHandlerResult>;

export type CreateRouterInput = {
    handlerMap: RouteHandlerMap;
    inputLogFunc?: (input: any) => void;
};

/**
 * Creates a router that routes events, commands or queries to the appropriate handler.
 *
 * @param CreateRouterInput - The input to create the router.
 * @returns Router
 */
export const createRouter = ({
    handlerMap,
    inputLogFunc,
}: CreateRouterInput): Router => {
    const router: Router = (input) => {
        if (inputLogFunc) {
            inputLogFunc(input);
        }

        if (!handlerMap[input.name]) {
            throw new NotFoundException(
                'Route handler not found',
                {
                    reason: `Could not find a handler for "${input.name}"`,
                },
            );
        }

        const { handler, inputType } = handlerMap[input.name];

        try {
            const validInput = inputType.parse(input);

            return handler(validInput);
        } catch (error) {
            if (error instanceof ZodError) {
                throw new InvalidInputException().fromZodError(error);
            } else {
                throw new GenericException().fromError(error as Error);
            }
        }
    };

    return router;
};
