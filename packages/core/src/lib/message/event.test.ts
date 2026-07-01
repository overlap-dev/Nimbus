import { assertEquals, assertExists, assertStringIncludes } from '@std/assert';
import { z } from 'zod';
import { prettyLogFormatter } from '../log/logFormatter.ts';
import { setupLogger } from '../log/logger.ts';
import {
    createEvent,
    type CreateEventInput,
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

Deno.test('createEvent passes through CloudEvents extension attributes', () => {
    const event = createEvent<TestEvent>({
        type: TEST_EVENT_TYPE,
        source: 'https://example.com',
        subject: '/users/123',
        data: {
            name: 'Acme',
        },
        metadata: { foo: 'bar' },
    });

    assertEquals(event.type, TEST_EVENT_TYPE);
    assertEquals(event.metadata, { foo: 'bar' });
});

Deno.test('eventSchema preserves extension attributes during validation', () => {
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

    assertEquals(result.success, true);
    if (result.success) {
        assertEquals(result.data.metadata, { foo: 'bar' });
    }
});

Deno.test('eventSchema preserves undeclared extension attributes', () => {
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

    assertEquals(result.success, true);
    if (result.success) {
        assertEquals(
            (result.data as typeof event).traceparent,
            '00-abc-def-01',
        );
    }
});

Deno.test('createEvent still applies defaults without extension attributes', () => {
    const event = createEvent({
        type: TEST_EVENT_TYPE,
        source: 'https://example.com',
        subject: '/users/123',
        data: {
            name: 'Acme',
        },
    });

    assertEquals(event.specversion, '1.0');
    assertEquals(event.datacontenttype, 'application/json');
    assertExists(event.id);
    assertExists(event.correlationid);
    assertExists(event.time);
});

Deno.test('createEvent warns when extension attribute names violate CloudEvents naming', () => {
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

        assertEquals(warnings.length, 1);
        const warning = warnings[0]!.join('\n');
        assertStringIncludes(warning, 'authContext');
        assertStringIncludes(warning, 'corr-123');
        assertStringIncludes(warning, 'event.test.ts');
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

Deno.test('createEvent does not warn for valid extension attribute names', () => {
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

        assertEquals(warnings.length, 0);
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
