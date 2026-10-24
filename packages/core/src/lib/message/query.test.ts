import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { prettyLogFormatter } from '../log/logFormatter.ts';
import { setupLogger } from '../log/logger.ts';
import {
    type CreateQueryInput,
    createQuery,
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

test('createQuery passes through CloudEvents extension attributes', () => {
    const query = createQuery<TestQuery>({
        type: TEST_QUERY_TYPE,
        source: 'https://example.com',
        data: {
            id: '123',
        },
        metadata: { foo: 'bar' },
    });

    assert.deepEqual(query.type, TEST_QUERY_TYPE);
    assert.deepEqual(query.metadata, { foo: 'bar' });
});

test('querySchema preserves extension attributes during validation', () => {
    const query = createQuery<TestQuery>({
        type: TEST_QUERY_TYPE,
        source: 'https://example.com',
        data: {
            id: '123',
        },
        metadata: { foo: 'bar' },
    });

    const result = testQuerySchema.safeParse(query);

    assert.deepEqual(result.success, true);
    if (result.success) {
        assert.deepEqual(result.data.metadata, { foo: 'bar' });
    }
});

test('querySchema preserves undeclared extension attributes', () => {
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

    assert.deepEqual(result.success, true);
    if (result.success) {
        assert.deepEqual(
            (result.data as typeof query).traceparent,
            '00-abc-def-01',
        );
    }
});

test('createQuery still applies defaults without extension attributes', () => {
    const query = createQuery({
        type: TEST_QUERY_TYPE,
        source: 'https://example.com',
        data: {
            id: '123',
        },
    });

    assert.deepEqual(query.specversion, '1.0');
    assert.deepEqual(query.datacontenttype, 'application/json');
    assert.ok(query.id !== undefined && query.id !== null);
    assert.ok(
        query.correlationid !== undefined && query.correlationid !== null,
    );
    assert.ok(query.time !== undefined && query.time !== null);
});

test('createQuery warns when extension attribute names violate CloudEvents naming', () => {
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

        assert.deepEqual(warnings.length, 1);
        const warning = warnings[0]!.join('\n');
        assert.ok(warning.includes('authContext'));
        assert.ok(warning.includes('corr-123'));
        assert.ok(warning.includes('query.test.ts'));
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

test('createQuery does not warn for valid extension attribute names', () => {
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

        assert.deepEqual(warnings.length, 0);
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
