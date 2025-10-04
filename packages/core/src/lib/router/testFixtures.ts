import type { SchemaObject } from 'ajv';
import { GenericException } from '../exception/genericException.ts';
import type { Command } from '../message/command.ts';
import { type Event, eventSchema } from '../message/event.ts';
import type { Query } from '../message/query.ts';
import type { MessageHandler } from './router.ts';

// =============================================================================
// Command Fixtures
// =============================================================================

export type TestCommandData = {
    aNumber: number;
};

export const testCommand: Command<TestCommandData> = {
    specversion: '1.0',
    id: '123',
    correlationid: '456',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-command',
    data: {
        aNumber: 42,
    },
    datacontenttype: 'application/json',
};

export const testCommandHandler: MessageHandler<
    Command<TestCommandData>,
    TestCommandData
> = async (command) => {
    return command.data;
};

// =============================================================================
// Query Fixtures
// =============================================================================

export type TestQueryData = {
    filter: string;
};

export type TestQueryResult = {
    foo: string;
};

export const testQuery: Query<TestQueryData> = {
    specversion: '1.0',
    id: '123',
    correlationid: '456',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-query',
    data: {
        filter: '42',
    },
    datacontenttype: 'application/json',
};

export const testQueryHandler: MessageHandler<
    Query<TestQueryData>,
    TestQueryResult
> = async () => {
    return {
        foo: 'bar',
    };
};

// =============================================================================
// Event Fixtures
// =============================================================================

export type TestEventData = {
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

export const testEventHandler: MessageHandler<
    Event<TestEventData>,
    TestEventData
> = async (event) => {
    if (event.data?.testException) {
        throw new GenericException('Test exception thrown');
    }

    return event.data;
};
