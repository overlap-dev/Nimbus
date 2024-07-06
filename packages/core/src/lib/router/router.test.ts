import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import pino from 'pino';
import { InvalidInputException, NotFoundException } from '../exception';
import { createRouter } from './router';
import { commandHandlerMap } from './testCommand';
import { eventHandlerMap } from './testEvent';
import { queryHandlerMap } from './testQuery';

describe('Router', () => {
    const logger = pino({ level: 'silent' });

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

    test('Router handles valid command input', async () => {
        const input = {
            name: 'TEST_COMMAND',
            metadata: {
                domain: 'TestDomain',
                version: 1,
                correlationId: '123',
                authContext: {
                    sub: 'admin@host.tld',
                    groups: ['admin'],
                    policy: { allowAnything: true },
                },
            },
            data: {
                aNumber: 1,
            },
        };

        const commandRouter = createRouter({
            handlerMap: commandHandlerMap,
            logger,
        });

        pipe(
            await commandRouter(input),
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
                            aNumber: 1,
                        },
                    });
                },
            ),
        );
    });

    test('Router handles valid query input', async () => {
        const input = {
            name: 'TEST_QUERY',
            metadata: {
                domain: 'TestDomain',
                version: 1,
                correlationId: '123',
                authContext: {
                    sub: 'admin@host.tld',
                    groups: ['admin'],
                    policy: { allowAnything: true },
                },
            },
        };

        const queryRouter = createRouter({
            handlerMap: queryHandlerMap,
            logger,
        });

        pipe(
            await queryRouter(input),
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
                            foo: 'bar',
                        },
                    });
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
});
