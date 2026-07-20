import { assertEquals, assertStringIncludes } from '@std/assert';
import { getLogger, setupLogger } from './logger.ts';
import { createLogTruncator } from './logTruncator.ts';

Deno.test('Logger applies configured truncator to log input', () => {
    const outputs: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
        outputs.push(args.map(String).join(' '));
    };

    try {
        setupLogger({
            logLevel: 'info',
            truncator: createLogTruncator({ maxMessageLength: 10 }),
        });

        getLogger().info({
            message: '0123456789ABCDEF',
            category: 'Test',
        });

        assertEquals(outputs.length, 1);
        assertStringIncludes(outputs[0]!, '0123456789…');
    } finally {
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});

Deno.test('Logger fails open when truncator throws', () => {
    const outputs: string[] = [];
    const warnings: unknown[][] = [];
    const originalInfo = console.info;
    const originalWarn = console.warn;

    console.info = (...args: unknown[]) => {
        outputs.push(args.map(String).join(' '));
    };
    console.warn = (...args: unknown[]) => {
        warnings.push(args);
    };

    try {
        setupLogger({
            logLevel: 'info',
            truncator: () => {
                throw new Error('boom');
            },
        });

        getLogger().info({
            message: 'original-message',
            category: 'Test',
        });

        assertEquals(outputs.length, 1);
        assertStringIncludes(outputs[0]!, 'original-message');
        assertEquals(warnings.length, 1);
    } finally {
        console.info = originalInfo;
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});
