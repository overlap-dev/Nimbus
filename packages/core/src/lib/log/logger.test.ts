import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLogger, setupLogger } from './logger.ts';
import { createLogTruncator } from './logTruncator.ts';

test('Logger applies configured truncator to log input', () => {
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

        assert.deepEqual(outputs.length, 1);
        assert.ok(outputs[0]!.includes('0123456789 [... __truncated]'));
    } finally {
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});

test('Logger fails open when truncator throws', () => {
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

        assert.deepEqual(outputs.length, 1);
        assert.ok(outputs[0]!.includes('original-message'));
        assert.deepEqual(warnings.length, 1);
    } finally {
        console.info = originalInfo;
        console.warn = originalWarn;
        setupLogger({ logLevel: 'silent' });
    }
});

test('Logger skips truncator when skipTruncation is true', () => {
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
            skipTruncation: true,
        });

        assert.deepEqual(outputs.length, 1);
        assert.ok(outputs[0]!.includes('0123456789ABCDEF'));
        assert.deepEqual(outputs[0]!.includes(' [... __truncated]'), false);
        assert.deepEqual(outputs[0]!.includes('skipTruncation'), false);
    } finally {
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});
