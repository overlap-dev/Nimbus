import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import pino from 'pino';
import { z } from 'zod';
import { InvalidInputException } from '../exception/invalidInputException';
import { NotFoundException } from '../exception/notFoundException';
import { Event } from './event';
import {
    EventHandler,
    EventHandlerMap,
    createEventRouter,
} from './eventRouter';

describe('EventRouter', () => {
    const logger = pino({ level: 'silent' });

    const AuthPolicy = z.object({
        allowAnything: z.boolean(),
    });
    type AuthPolicy = z.infer<typeof AuthPolicy>;

    const TestEventData = z.object({
        testException: z.boolean(),
        aNumber: z.number(),
    });
    type TestEventData = z.infer<typeof TestEventData>;

    const TestEvent = Event(z.literal('TEST_EVENT'), TestEventData, AuthPolicy);
    type TestEvent = z.infer<typeof TestEvent>;

    const testEventHandler: EventHandler<TestEvent, TestEventData> = async (
        event,
    ) => {
        if (event.data.testException) {
            return E.left(new NotFoundException());
        }

        return E.right({
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            data: event.data,
        });
    };

    const eventHandlerMap: EventHandlerMap = {
        TEST_EVENT: {
            handler: testEventHandler,
            eventType: TestEvent,
        },
    };

    test('Create new EventRouter', () => {
        const eventRouter = createEventRouter({ eventHandlerMap, logger });

        expect(eventRouter).toBeDefined();
    });

    test('EventRouter handles a valid payload', async () => {
        const payload = {
            name: 'TEST_EVENT',
            metadata: {
                domain: 'TestDomain',
                producer: 'JestTest',
                version: 1,
                correlationId: '123',
                authContext: {
                    sub: 'admin@host.tld',
                    groups: ['admin'],
                    policy: { allowAnything: true },
                },
            },
            data: {
                testException: false,
                aNumber: 1,
            },
        };

        const eventRouter = createEventRouter({ eventHandlerMap, logger });

        pipe(
            await eventRouter(payload),
            E.match(
                (exception) => {
                    expect(exception).toBeUndefined();
                },
                (result) => {
                    expect(result).toEqual({
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: {
                            testException: false,
                            aNumber: 1,
                        },
                    });
                },
            ),
        );
    });

    test('EventRouter handles an invalid payload', async () => {
        const invalidPayload = {
            name: 'TEST_EVENT',
            metadata: {
                domain: 'TestDomain',
                producer: 'JestTest',
                version: 1,
                correlationId: '123',
                authContext: {
                    sub: 'admin@host.tld',
                    groups: ['admin'],
                    policy: { allowAnything: true },
                },
            },
            data: {
                testException: false,
                aNumber: '123', // This should trigger a validation error
            },
        };

        const eventRouter = createEventRouter({ eventHandlerMap, logger });

        pipe(
            await eventRouter(invalidPayload),
            E.match(
                (exception) => {
                    expect(exception instanceof InvalidInputException).toBe(
                        true,
                    );
                    expect(exception.message).toBe(
                        'The provided input is invalid',
                    );
                    expect(exception.details).toEqual({
                        issues: [
                            {
                                code: 'invalid_type',
                                expected: 'number',
                                received: 'string',
                                path: ['data', 'aNumber'],
                                message: 'Expected number, received string',
                            },
                        ],
                    });
                },
                (result) => {
                    expect(result).toBeUndefined();
                },
            ),
        );
    });
});
