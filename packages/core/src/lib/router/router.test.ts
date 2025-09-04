import type { Event, Query } from '@nimbus/core';
import { assertEquals, assertInstanceOf } from '@std/assert';
import { GenericException } from '../exception/genericException.ts';
import { InvalidInputException } from '../exception/invalidInputException.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import type { Command } from '../message/command.ts';
import { getValidator } from '../validator/validator.ts';
import { createRouter } from './router.ts';
import { commandHandlerMap, testCommand } from './testCommand.ts';
import {
    eventHandlerMap,
    testEvent,
    testEventSchema,
    testEventWithException,
    testEventWithInvalidData,
} from './testEvent.ts';
import { queryHandlerMap, testQuery } from './testQuery.ts';

Deno.test('Router handles input with an unknown handler name', async () => {
    const router = createRouter({
        type: 'command',
        handlerMap: {},
    });

    const messageWithUnknownType: Command = {
        specversion: '1.0',
        id: '123',
        correlationid: '456',
        time: '2025-01-01T00:00:00Z',
        source: 'https://nimbus.overlap.at',
        type: 'at.overlap.nimbus.unknown-type',
        data: {},
    };

    try {
        const result = await router(messageWithUnknownType);
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        assertInstanceOf(exception, NotFoundException);
        assertEquals(exception.message, 'Route handler not found');
    }
});

Deno.test('Router validates command input', async () => {
    const router = createRouter({
        type: 'command',
        handlerMap: {},
    });

    const messageWithUnknownType = {
        specversion: '1.0',
        id: '123',
        time: '2025-01-01T00:00:00Z',
        source: 'https://nimbus.overlap.at',
        type: 'at.overlap.nimbus.unknown-type',
        data: {},
    };

    try {
        const result = await router(messageWithUnknownType);
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        assertInstanceOf(exception, InvalidInputException);
        assertEquals(exception.message, 'The provided input is invalid');
        assertEquals(exception.details, {
            issues: [
                {
                    instancePath: '',
                    schemaPath: '#/required',
                    keyword: 'required',
                    params: { missingProperty: 'correlationid' },
                    message: "must have required property 'correlationid'",
                },
            ],
        });
    }
});

Deno.test('Router validates query input', async () => {
    const router = createRouter({
        type: 'query',
        handlerMap: {},
    });

    const messageWithUnknownType = {
        id: '123',
        time: '2025-01-01T00:00:00Z',
        source: 'https://nimbus.overlap.at',
        type: 'at.overlap.nimbus.unknown-type',
        data: {},
    };

    try {
        const result = await router(messageWithUnknownType);
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        assertInstanceOf(exception, InvalidInputException);
        assertEquals(exception.message, 'The provided input is invalid');
        assertEquals(exception.details, {
            issues: [
                {
                    instancePath: '',
                    schemaPath: '#/required',
                    keyword: 'required',
                    params: { missingProperty: 'specversion' },
                    message: "must have required property 'specversion'",
                },
            ],
        });
    }
});

Deno.test('Router validates event input', async () => {
    const router = createRouter({
        type: 'event',
        handlerMap: {},
    });

    const messageWithUnknownType = {
        id: '123',
        time: '2025-01-01T00:00:00Z',
        source: 'https://nimbus.overlap.at',
        type: 'at.overlap.nimbus.unknown-type',
        data: {},
    };

    try {
        const result = await router(messageWithUnknownType);
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        assertInstanceOf(exception, InvalidInputException);
        assertEquals(exception.message, 'The provided input is invalid');
        assertEquals(exception.details, {
            issues: [
                {
                    instancePath: '',
                    schemaPath: '#/required',
                    keyword: 'required',
                    params: { missingProperty: 'specversion' },
                    message: "must have required property 'specversion'",
                },
            ],
        });
    }
});

Deno.test('Router handles valid command input', async () => {
    const commandRouter = createRouter<Command<any>>({
        type: 'command',
        handlerMap: commandHandlerMap,
    });

    try {
        const result = await commandRouter(testCommand);

        assertEquals(result, {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                aNumber: 42,
            },
        });
    } catch (exception: any) {
        console.log(exception);
        assertEquals(typeof exception === 'undefined', true);
    }
});

Deno.test('Router handles valid query input', async () => {
    const queryRouter = createRouter<Query<any>>({
        type: 'query',
        handlerMap: queryHandlerMap,
    });

    try {
        const result = await queryRouter(testQuery);
        assertEquals(result, {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                foo: 'bar',
            },
        });
    } catch (exception: any) {
        console.log(exception);
        assertEquals(typeof exception === 'undefined', true);
    }
});

Deno.test('Router handles message with no dataschema correctly', async () => {
    const validator = getValidator();
    validator.addSchema(testEventSchema);

    const eventRouter = createRouter<Event<any>>({
        type: 'event',
        handlerMap: eventHandlerMap,
    });

    try {
        const result = await eventRouter({
            ...testEvent,
            dataschema: undefined,
        });
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        console.log(exception);
        assertInstanceOf(exception, InvalidInputException);
        assertEquals(exception.message, 'No dataschema provided for message');
    }
});

Deno.test('Router handles valid event input', async () => {
    const validator = getValidator();
    validator.addSchema(testEventSchema);

    const eventRouter = createRouter<Event<any>>({
        type: 'event',
        handlerMap: eventHandlerMap,
    });

    try {
        const result = await eventRouter(testEvent);
        assertEquals(result, {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                testException: false,
                aNumber: 42,
            },
        });
    } catch (exception: any) {
        assertEquals(typeof exception === 'undefined', true);
    }
});

Deno.test('Router handles invalid event input', async () => {
    const validator = getValidator();
    validator.addSchema(testEventSchema);

    const eventRouter = createRouter<Event<any>>({
        type: 'event',
        handlerMap: eventHandlerMap,
    });

    try {
        const result = await eventRouter(testEventWithInvalidData);
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        assertInstanceOf(exception, InvalidInputException);
        assertEquals(
            exception.message,
            'The provided input is invalid',
        );

        assertEquals(exception.details, {
            issues: [
                {
                    instancePath: '/data/aNumber',
                    schemaPath: '#/properties/data/properties/aNumber/type',
                    keyword: 'type',
                    params: { type: 'number' },
                    message: 'must be number',
                },
            ],
        });
    }
});

Deno.test('Router handles valid event input but handler returns an exception', async () => {
    const eventRouter = createRouter<Event<any>>({
        type: 'event',
        handlerMap: eventHandlerMap,
    });

    try {
        const result = await eventRouter(testEventWithException);
        assertEquals(typeof result === 'undefined', true);
    } catch (exception: any) {
        assertInstanceOf(exception, GenericException);
    }
});
