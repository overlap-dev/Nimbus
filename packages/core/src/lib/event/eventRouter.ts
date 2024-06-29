import * as E from 'fp-ts/Either';
import { Logger } from 'pino';
import { ZodError, ZodType } from 'zod';
import { Exception } from '../exception/exception';
import { GenericException } from '../exception/genericException';
import { InvalidInputException } from '../exception/invalidInputException';
import { NotFoundException } from '../exception/notFoundException';

export type EventHandlerResult<TData = unknown> = {
    statusCode: number;
    headers?: Record<string, string>;
    data: TData;
};

export type EventHandler<TEvent = any, TResultData = any> = (
    event: TEvent,
) => Promise<E.Either<Exception, EventHandlerResult<TResultData>>>;

export type EventHandlerMap = Record<
    string,
    {
        handler: EventHandler;
        eventType: ZodType;
    }
>;

export type EventRouter = (event: any) => Promise<E.Either<Exception, unknown>>;

export type CreateEventRouterInput = {
    eventHandlerMap: EventHandlerMap;
    logger: Logger;
};

/**
 * Creates an event router that routes events to the appropriate event handler.
 *
 * @param CreateEventRouterInput - The input to create the event router.
 * @returns EventRouter
 */
export const createEventRouter = ({
    eventHandlerMap,
    logger,
}: CreateEventRouterInput): EventRouter => {
    // TODO: Do we need middleware support, and would this be the place to add it?

    const eventRouter: EventRouter = async (event) => {
        logger.debug('Nimbus - EventRouter received event', event);

        const { handler, eventType } = eventHandlerMap[event.name];

        if (!handler) {
            const notFoundException = new NotFoundException(
                'Event handler not found',
                {
                    reason: `No handler is defined for the "${event.name}" event.`,
                },
            );

            logger.info('Nimbus - EventRouter', notFoundException);
            return E.left(notFoundException);
        }

        try {
            const validEvent = eventType.parse(event);

            return handler(validEvent);
        } catch (error) {
            if (error instanceof ZodError) {
                const invalidInputException =
                    new InvalidInputException().fromZodError(error);

                logger.info('Nimbus - EventRouter', invalidInputException);
                return E.left(invalidInputException);
            } else {
                const genericException = new GenericException().fromError(
                    error as Error,
                );

                logger.error('Nimbus - EventRouter', genericException);
                return E.left(genericException);
            }
        }
    };

    return eventRouter;
};
