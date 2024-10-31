import * as E from '@baetheus/fun/either';
import { pipe } from '@baetheus/fun/fn';
import { assertEquals, assertInstanceOf } from '@std/assert';
import {
    InvalidInputException,
    NotFoundException,
} from '../exception/index.ts';
import { createRouter } from './router.ts';
import { commandHandlerMap } from './testCommand.ts';
import { eventHandlerMap } from './testEvent.ts';
import { queryHandlerMap } from './testQuery.ts';

Deno.test('Router handles input with an unknown handler name', async () => {
    const router = createRouter({
        handlerMap: {},
    });

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

    pipe(
        await router(input),
        E.match(
            (exception) => {
                assertInstanceOf(exception, NotFoundException);
                assertEquals(exception.message, 'Route handler not found');
            },
            (result) => {
                assertEquals(typeof result === 'undefined', true);
            },
        ),
    );
});

Deno.test('Router handles valid command input', async () => {
    const commandRouter = createRouter({
        handlerMap: commandHandlerMap,
    });

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

    pipe(
        await commandRouter(input),
        E.match(
            (exception) => {
                assertEquals(typeof exception === 'undefined', true);
            },
            (result) => {
                assertEquals(result, {
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

Deno.test('Router handles valid query input', async () => {
    const queryRouter = createRouter({
        handlerMap: queryHandlerMap,
    });

    const input = {
        name: 'TEST_QUERY',
        params: {},
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

    pipe(
        await queryRouter(input),
        E.match(
            (exception) => {
                console.log(exception);
                assertEquals(typeof exception === 'undefined', true);
            },
            (result) => {
                assertEquals(result, {
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

Deno.test('Router handles valid event input', async () => {
    const eventRouter = createRouter({
        handlerMap: eventHandlerMap,
    });

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

    pipe(
        await eventRouter(input),
        E.match(
            (exception) => {
                assertEquals(typeof exception === 'undefined', true);
            },
            (result) => {
                assertEquals(result, {
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

Deno.test('Router handles invalid event input', async () => {
    const eventRouter = createRouter({
        handlerMap: eventHandlerMap,
    });

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

    pipe(
        await eventRouter(invalidInput),
        E.match(
            (exception) => {
                assertInstanceOf(exception, InvalidInputException);
                assertEquals(
                    exception.message,
                    'The provided input is invalid',
                );
                assertEquals(exception.details, {
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
                assertEquals(typeof result === 'undefined', true);
            },
        ),
    );
});

Deno.test('Router handles valid event input but handler returns an exception', async () => {
    const eventRouter = createRouter({
        handlerMap: eventHandlerMap,
    });

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

    pipe(
        await eventRouter(input),
        E.match(
            (exception) => {
                assertInstanceOf(exception, NotFoundException);
            },
            (result) => {
                assertEquals(typeof result === 'undefined', true);
            },
        ),
    );
});
