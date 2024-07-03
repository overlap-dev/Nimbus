import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import pino from 'pino';
import { z } from 'zod';
import { Event } from '../event/event';
import { InvalidInputException } from '../exception/invalidInputException';
import { NotFoundException } from '../exception/notFoundException';
import { RouteHandler, RouteHandlerMap, createRouter } from './router';

describe('Router', () => {
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

    const testEventHandler: RouteHandler<TestEvent, TestEventData> = async (
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

    const eventHandlerMap: RouteHandlerMap = {
        TEST_EVENT: {
            handler: testEventHandler,
            inputType: TestEvent,
        },
    };

    test('Create a new router', () => {
        const router = createRouter({
            handlerMap: {},
            logger,
        });

        expect(router).toBeDefined();
    });

    test('Router handles input with an unknown handler name', async () => {
        const input = {
            name: 'UNKNOWN_EVENT',
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

        const router = createRouter({
            handlerMap: {},
            logger,
        });

        pipe(
            await router(input),
            E.match(
                (exception) => {
                    expect(exception instanceof NotFoundException).toBe(true);
                    expect(exception.message).toBe('Route handler not found');
                },
                (result) => {
                    expect(result).toBeUndefined();
                },
            ),
        );
    });

    test('Router handles valid event input', async () => {
        const input = {
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

        const eventRouter = createRouter({
            handlerMap: eventHandlerMap,
            logger,
        });

        pipe(
            await eventRouter(input),
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

    test('Router handles invalid event input', async () => {
        const invalidInput = {
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

        const eventRouter = createRouter({
            handlerMap: eventHandlerMap,
            logger,
        });

        pipe(
            await eventRouter(invalidInput),
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

    test('Router handles valid event input but handler returns an exception', async () => {
        const input = {
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
                testException: true,
                aNumber: 1,
            },
        };

        const eventRouter = createRouter({
            handlerMap: eventHandlerMap,
            logger,
        });

        pipe(
            await eventRouter(input),
            E.match(
                (exception) => {
                    expect(exception instanceof NotFoundException).toBe(true);
                },
                (result) => {
                    expect(result).toBeUndefined();
                },
            ),
        );
    });

    // TODO: add tests for commandRouter and queryRouter
});
