import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { prettyLogFormatter } from '../log/logFormatter.ts';
import { setupLogger } from '../log/logger.ts';
import {
    type CreateEventInput,
    createEvent,
    type Event,
    eventSchema,
} from './event.ts';

const TEST_EVENT_TYPE = 'at.example.test-event';

type TestEventData = {
    name: string;
};

const testEventSchema = eventSchema.extend({
    type: z.literal(TEST_EVENT_TYPE),
    data: z.object({
        name: z.string(),
    }),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

type TestEvent = z.infer<typeof testEventSchema>;

test('createEvent passes through CloudEvents extension attributes', () => {
    const event = createEvent<TestEvent>({
        type: TEST_EVENT_TYPE,
        source: 'https://example.com',
        subject: '/users/123',
        data: {
            name: 'Acme',
        },
        metadata: { foo: 'bar' },
    });

    assert.deepEqual(event.type, TEST_EVENT_TYPE);
    assert.deepEqual(event.metadata, { foo: 'bar' });
});

test('eventSchema preserves extension attributes during validation', () => {
    const event = createEvent<TestEvent>({
        type: TEST_EVENT_TYPE,
        source: 'https://example.com',
        subject: '/users/123',
        data: {
            name: 'Acme',
        },
        metadata: { foo: 'bar' },
    });

    const result = testEventSchema.safeParse(event);

    assert.deepEqual(result.success, true);
    if (result.success) {
        assert.deepEqual(result.data.metadata, { foo: 'bar' });
    }
});

test('eventSchema preserves undeclared extension attributes', () => {
    const event: Event<TestEventData> & {
        traceparent: string;
    } = {
        specversion: '1.0',
        id: '01J0000000000000000000000',
        correlationid: '01J0000000000000000000001',
        time: '2025-01-01T00:00:00.000Z',
        source: 'https://example.com',
        type: TEST_EVENT_TYPE,
        subject: '/users/123',
        data: {
            name: 'Acme',
        },
        traceparent: '00-abc-def-01',
    };

    const result = eventSchema.safeParse(event);

    assert.deepEqual(result.success, true);
    if (result.success) {
        assert.deepEqual(
            (result.data as typeof event).traceparent,
            '00-abc-def-01',
        );
    }
});

test('createEvent still applies defaults without extension attributes', () => {
    const event = createEvent({
        type: TEST_EVENT_TYPE,
        source: 'https://example.com',
        subject: '/users/123',
        data: {
            name: 'Acme',
        },
    });

    assert.deepEqual(event.specversion, '1.0');
    assert.deepEqual(event.datacontenttype, 'application/json');
    assert.ok(event.id !== undefined && event.id !== null);
    assert.ok(
        event.correlationid !== undefined && event.correlationid !== null,
    );
    assert.ok(event.time !== undefined && event.time !== null);
});

test('createEvent warns when extension attribute names violate CloudEvents naming', () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    setupLogger({
        logLevel: 'warn',
        formatter: prettyLogFormatter,
    });

    try {
        createEvent({
            type: TEST_EVENT_TYPE,
            source: 'https://example.com',
            subject: '/users/123',
            correlationid: 'corr-123',
            data: {
                name: 'Acme',
            },
            authContext: {
                sub: '123',
            },
        } as unknown as CreateEventInput);

        assert.deepEqual(warnings.length, 1);
        const warning = warnings[0]!.join('\n');
        assert.ok(warning.includes('authContext'));
        assert.ok(warning.includes('corr-123'));
        assert.ok(warning.includes('event.test.ts'));
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

test('createEvent does not warn for valid extension attribute names', () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    setupLogger({ logLevel: 'warn' });

    try {
        createEvent<TestEvent>({
            type: TEST_EVENT_TYPE,
            source: 'https://example.com',
            subject: '/users/123',
            data: {
                name: 'Acme',
            },
            metadata: { foo: 'bar' },
        });

        assert.deepEqual(warnings.length, 0);
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
