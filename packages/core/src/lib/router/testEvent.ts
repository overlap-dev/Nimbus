import type { SchemaObject } from 'ajv';
import { GenericException } from '../exception/genericException.ts';
import { type Event, eventSchema } from '../message/event.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

type TestEventData = {
    testException: boolean;
    aNumber: number;
};

export const testEventSchema: SchemaObject = {
    ...eventSchema,
    $id: 'https://api.nimbus.overlap.at/schemas/event/test/v1',
    properties: {
        ...eventSchema.properties,
        data: {
            type: 'object',
            required: ['testException', 'aNumber'],
            properties: {
                testException: { type: 'boolean' },
                aNumber: { type: 'number' },
            },
        },
        dataschema: {
            const: 'https://api.nimbus.overlap.at/schemas/event/test/v1',
        },
    },
};

/**
 * A test event without an exception
 */
export const testEvent: Event<TestEventData> = {
    specversion: '1.0',
    id: '123',
    correlationid: '456',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-event',
    subject: '/test',
    data: {
        testException: false,
        aNumber: 42,
    },
    datacontenttype: 'application/json',
    dataschema: 'https://api.nimbus.overlap.at/schemas/event/test/v1',
};

/**
 * A test event without an exception
 */
export const testEventWithException: Event<TestEventData> = {
    specversion: '1.0',
    id: '123',
    correlationid: '456',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-event',
    subject: '/test',
    data: {
        testException: true,
        aNumber: 42,
    },
    datacontenttype: 'application/json',
    dataschema: 'https://api.nimbus.overlap.at/schemas/event/test/v1',
};

/**
 * A test event without an exception
 */
export const testEventWithInvalidData: Event<any> = {
    specversion: '1.0',
    id: '123',
    correlationid: '456',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-event',
    subject: '/test',
    data: {
        testException: true,
        aNumber: '42', // This should trigger a validation error
    },
    datacontenttype: 'application/json',
    dataschema: 'https://api.nimbus.overlap.at/schemas/event/test/v1',
};

/**
 * The handler for the TestEvent.
 */
export const testEventHandler: RouteHandler<Event<TestEventData>> = (
    event,
) => {
    if (event.data?.testException) {
        throw new GenericException();
    }

    return Promise.resolve({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: event.data,
    });
};

/**
 * The handler map for the TestEvent.
 */
export const eventHandlerMap: RouteHandlerMap<Event<any>> = {
    'at.overlap.nimbus.test-event': {
        handler: testEventHandler,
    },
};
