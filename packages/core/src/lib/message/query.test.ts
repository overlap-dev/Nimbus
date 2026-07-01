import { assertEquals, assertExists, assertStringIncludes } from '@std/assert';
import { z } from 'zod';
import { prettyLogFormatter } from '../log/logFormatter.ts';
import { setupLogger } from '../log/logger.ts';
import {
    createQuery,
    type CreateQueryInput,
    type Query,
    querySchema,
} from './query.ts';

const TEST_QUERY_TYPE = 'at.example.test-query';

type TestQueryData = {
    id: string;
};

const testQuerySchema = querySchema.extend({
    type: z.literal(TEST_QUERY_TYPE),
    data: z.object({
        id: z.string(),
    }),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

type TestQuery = z.infer<typeof testQuerySchema>;

Deno.test('createQuery passes through CloudEvents extension attributes', () => {
    const query = createQuery<TestQuery>({
        type: TEST_QUERY_TYPE,
        source: 'https://example.com',
        data: {
            id: '123',
        },
        metadata: { foo: 'bar' },
    });

    assertEquals(query.type, TEST_QUERY_TYPE);
    assertEquals(query.metadata, { foo: 'bar' });
});

Deno.test('querySchema preserves extension attributes during validation', () => {
    const query = createQuery<TestQuery>({
        type: TEST_QUERY_TYPE,
        source: 'https://example.com',
        data: {
            id: '123',
        },
        metadata: { foo: 'bar' },
    });

    const result = testQuerySchema.safeParse(query);

    assertEquals(result.success, true);
    if (result.success) {
        assertEquals(result.data.metadata, { foo: 'bar' });
    }
});

Deno.test('querySchema preserves undeclared extension attributes', () => {
    const query: Query<TestQueryData> & {
        traceparent: string;
    } = {
        specversion: '1.0',
        id: '01J0000000000000000000000',
        correlationid: '01J0000000000000000000001',
        time: '2025-01-01T00:00:00.000Z',
        source: 'https://example.com',
        type: TEST_QUERY_TYPE,
        data: {
            id: '123',
        },
        traceparent: '00-abc-def-01',
    };

    const result = querySchema.safeParse(query);

    assertEquals(result.success, true);
    if (result.success) {
        assertEquals(
            (result.data as typeof query).traceparent,
            '00-abc-def-01',
        );
    }
});

Deno.test('createQuery still applies defaults without extension attributes', () => {
    const query = createQuery({
        type: TEST_QUERY_TYPE,
        source: 'https://example.com',
        data: {
            id: '123',
        },
    });

    assertEquals(query.specversion, '1.0');
    assertEquals(query.datacontenttype, 'application/json');
    assertExists(query.id);
    assertExists(query.correlationid);
    assertExists(query.time);
});

Deno.test('createQuery warns when extension attribute names violate CloudEvents naming', () => {
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
        createQuery({
            type: TEST_QUERY_TYPE,
            source: 'https://example.com',
            correlationid: 'corr-123',
            data: {
                id: '123',
            },
            authContext: {
                sub: '123',
            },
        } as unknown as CreateQueryInput);

        assertEquals(warnings.length, 1);
        const warning = warnings[0]!.join('\n');
        assertStringIncludes(warning, 'authContext');
        assertStringIncludes(warning, 'corr-123');
        assertStringIncludes(warning, 'query.test.ts');
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

Deno.test('createQuery does not warn for valid extension attribute names', () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    setupLogger({ logLevel: 'warn' });

    try {
        createQuery<TestQuery>({
            type: TEST_QUERY_TYPE,
            source: 'https://example.com',
            data: {
                id: '123',
            },
            metadata: { foo: 'bar' },
        });

        assertEquals(warnings.length, 0);
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
