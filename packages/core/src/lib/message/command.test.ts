import { assertEquals, assertExists, assertStringIncludes } from '@std/assert';
import { z } from 'zod';
import { prettyLogFormatter } from '../log/logFormatter.ts';
import { setupLogger } from '../log/logger.ts';
import {
    type Command,
    commandSchema,
    createCommand,
    type CreateCommandInput,
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

Deno.test('createCommand passes through CloudEvents extension attributes', () => {
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

    assertEquals(command.type, TEST_COMMAND_TYPE);
    assertEquals(command.metadata, { foo: 'bar' });
    assertEquals(command.authcontext.sub, '123');
    assertEquals(command.authcontext.groups, ['admin']);
});

Deno.test('commandSchema preserves extension attributes during validation', () => {
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

    assertEquals(result.success, true);
    if (result.success) {
        assertEquals(result.data.metadata, { foo: 'bar' });
        assertEquals(result.data.authcontext.email, 'test@example.com');
    }
});

Deno.test('commandSchema preserves undeclared extension attributes', () => {
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

    assertEquals(result.success, true);
    if (result.success) {
        assertEquals(
            (result.data as typeof command).traceparent,
            '00-abc-def-01',
        );
    }
});

Deno.test('createCommand still applies defaults without extension attributes', () => {
    const command = createCommand({
        type: TEST_COMMAND_TYPE,
        source: 'https://example.com',
        data: {
            name: 'Acme',
        },
    });

    assertEquals(command.specversion, '1.0');
    assertEquals(command.datacontenttype, 'application/json');
    assertExists(command.id);
    assertExists(command.correlationid);
    assertExists(command.time);
});

Deno.test('createCommand warns when extension attribute names violate CloudEvents naming', () => {
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

        assertEquals(warnings.length, 1);
        const warning = warnings[0]!.join('\n');
        assertStringIncludes(warning, 'authContext');
        assertStringIncludes(warning, 'foo-bar');
        assertStringIncludes(warning, 'corr-123');
        assertStringIncludes(warning, 'command.test.ts');
        assertStringIncludes(
            warning,
            'Invalid CloudEvents extension attribute names',
        );
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

Deno.test('createCommand does not warn for valid extension attribute names', () => {
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

        assertEquals(warnings.length, 0);
    } finally {
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
