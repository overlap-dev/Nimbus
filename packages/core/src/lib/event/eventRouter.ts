import * as E from 'fp-ts/Either';
import { Logger } from 'pino';
import { ZodError } from 'zod';
import { Exception } from '../exception/exception';
import { GenericException } from '../exception/genericException';
import { InvalidInputException } from '../exception/invalidInputException';
import { NotFoundException } from '../exception/notFoundException';
import { AnyEvent } from './event';

export type EventHandlerResult<TData = unknown> = {
    statusCode: number;
    headers?: Record<string, string>;
    data: TData;
};

export type EventHandler<TResultData = unknown> = (
    event: AnyEvent,
) => Promise<E.Either<Exception, EventHandlerResult<TResultData>>>;

export type EventRouter = (
    event: AnyEvent,
) => Promise<E.Either<Exception, unknown>>;

export type CreateEventRouterInput = {
    eventHandlerMap: Record<string, EventHandler>;
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
}: CreateEventRouterInput) => {
    // TODO: Do we need middleware support, and would this be the place to add it?

    const eventRouter: EventRouter = async (event) => {
        logger.debug('Nimbus - EventRouter received event', event);

        const handler = eventHandlerMap[event.name];

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
            const validEvent = AnyEvent.parse(event);

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
