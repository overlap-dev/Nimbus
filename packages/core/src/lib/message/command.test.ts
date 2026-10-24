import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { prettyLogFormatter } from '../log/logFormatter.ts';
import { setupLogger } from '../log/logger.ts';
import {
    type Command,
    type CreateCommandInput,
    commandSchema,
    createCommand,
} from './command.ts';

const TEST_COMMAND_TYPE = 'at.example.test-command';

type TestCommandData = {
    name: string;
};

const authContextSchema = z.object({
    sub: z.string(),
    email: z.email(),
    groups: z.array(z.string()),
});

const testCommandSchema = commandSchema.extend({
    type: z.literal(TEST_COMMAND_TYPE),
    data: z.object({
        name: z.string(),
    }),
    metadata: z.record(z.string(), z.unknown()).optional(),
    authcontext: authContextSchema,
});

type TestCommand = z.infer<typeof testCommandSchema>;

test('createCommand passes through CloudEvents extension attributes', () => {
    const command = createCommand<TestCommand>({
        type: TEST_COMMAND_TYPE,
        source: 'https://example.com',
        data: {
            name: 'Acme',
        },
        metadata: { foo: 'bar' },
        authcontext: {
            sub: '123',
            email: 'test@example.com',
            groups: ['admin'],
        },
    });

    assert.deepEqual(command.type, TEST_COMMAND_TYPE);
    assert.deepEqual(command.metadata, { foo: 'bar' });
    assert.deepEqual(command.authcontext.sub, '123');
    assert.deepEqual(command.authcontext.groups, ['admin']);
});

test('commandSchema preserves extension attributes during validation', () => {
    const command = createCommand<TestCommand>({
        type: TEST_COMMAND_TYPE,
        source: 'https://example.com',
        data: {
            name: 'Acme',
        },
        metadata: { foo: 'bar' },
        authcontext: {
            sub: '123',
            email: 'test@example.com',
            groups: ['admin'],
        },
    });

    const result = testCommandSchema.safeParse(command);

    assert.deepEqual(result.success, true);
    if (result.success) {
        assert.deepEqual(result.data.metadata, { foo: 'bar' });
        assert.deepEqual(result.data.authcontext.email, 'test@example.com');
    }
});

test('commandSchema preserves undeclared extension attributes', () => {
    const command: Command<TestCommandData> & {
        traceparent: string;
    } = {
        specversion: '1.0',
        id: '01J0000000000000000000000',
        correlationid: '01J0000000000000000000001',
        time: '2025-01-01T00:00:00.000Z',
        source: 'https://example.com',
        type: TEST_COMMAND_TYPE,
        data: {
            name: 'Acme',
        },
        traceparent: '00-abc-def-01',
    };

    const result = commandSchema.safeParse(command);

    assert.deepEqual(result.success, true);
    if (result.success) {
        assert.deepEqual(
            (result.data as typeof command).traceparent,
            '00-abc-def-01',
        );
    }
});

test('createCommand still applies defaults without extension attributes', () => {
    const command = createCommand({
        type: TEST_COMMAND_TYPE,
        source: 'https://example.com',
        data: {
            name: 'Acme',
        },
    });

    assert.deepEqual(command.specversion, '1.0');
    assert.deepEqual(command.datacontenttype, 'application/json');
    assert.ok(command.id !== undefined && command.id !== null);
    assert.ok(
        command.correlationid !== undefined && command.correlationid !== null,
    );
    assert.ok(command.time !== undefined && command.time !== null);
});

test('createCommand warns when extension attribute names violate CloudEvents naming', () => {
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
        createCommand({
            type: TEST_COMMAND_TYPE,
            source: 'https://example.com',
            correlationid: 'corr-123',
            data: {
                name: 'Acme',
            },
            authContext: {
                sub: '123',
            },
            'foo-bar': 'baz',
        } as unknown as CreateCommandInput);

        assert.deepEqual(warnings.length, 1);
        const warning = warnings[0]!.join('\n');
        assert.ok(warning.includes('authContext'));
        assert.ok(warning.includes('foo-bar'));
        assert.ok(warning.includes('corr-123'));
        assert.ok(warning.includes('command.test.ts'));
        assert.ok(
            warning.includes('Invalid CloudEvents extension attribute names'),
        );
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

test('createCommand does not warn for valid extension attribute names', () => {
    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    setupLogger({ logLevel: 'warn' });

    try {
        createCommand<TestCommand>({
            type: TEST_COMMAND_TYPE,
            source: 'https://example.com',
            data: {
                name: 'Acme',
            },
            metadata: { foo: 'bar' },
            authcontext: {
                sub: '123',
                email: 'test@example.com',
                groups: ['admin'],
            },
        });

        assert.deepEqual(warnings.length, 0);
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
