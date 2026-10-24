import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupLogger } from '@nimbus-cqrs/core';
import { Hono } from 'hono';
import { logger } from './logger.ts';

test('logger middleware logs request and response at configured logLevel', async () => {
    const debugOutputs: string[] = [];
    const infoOutputs: string[] = [];
    const originalDebug = console.debug;
    const originalInfo = console.info;

    console.debug = (...args: unknown[]) => {
        debugOutputs.push(args.map(String).join(' '));
    };
    console.info = (...args: unknown[]) => {
        infoOutputs.push(args.map(String).join(' '));
    };

    try {
        setupLogger({ logLevel: 'debug' });

        const app = new Hono();
        app.use(logger({ enableTracing: false, logLevel: 'debug' }));
        app.get('/users', (c) => c.text('ok'));

        const response = await app.request('/users');
        assert.deepEqual(response.status, 200);
        assert.deepEqual(await response.text(), 'ok');

        assert.deepEqual(debugOutputs.length, 2);
        assert.deepEqual(infoOutputs.length, 0);
        assert.ok(debugOutputs[0]!.includes('REQ: [GET] /users'));
        assert.ok(debugOutputs[1]!.includes('RES: [GET] /users'));
    } finally {
        console.debug = originalDebug;
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});

test('logger middleware groups long durations with a thousands separator', async () => {
    const infoOutputs: string[] = [];
    const originalInfo = console.info;
    const originalNow = Date.now;
    let now = 0;

    console.info = (...args: unknown[]) => {
        infoOutputs.push(args.map(String).join(' '));
    };
    Date.now = () => now;

    try {
        setupLogger({ logLevel: 'info' });

        const app = new Hono();
        app.use(logger({ enableTracing: false, logLevel: 'info' }));
        app.get('/users', (c) => {
            now = 1_234_000;
            return c.text('ok');
        });

        const response = await app.request('/users');
        assert.deepEqual(response.status, 200);
        assert.deepEqual(infoOutputs.length, 2);
        assert.ok(infoOutputs[1]!.includes('RES: [GET] /users - 1,234s'));
    } finally {
        console.info = originalInfo;
        Date.now = originalNow;
        setupLogger({ logLevel: 'silent' });
    }
});

test('logger middleware skips request and response logs when logLevel is silent', async () => {
    const infoOutputs: string[] = [];
    const originalInfo = console.info;

    console.info = (...args: unknown[]) => {
        infoOutputs.push(args.map(String).join(' '));
    };

    try {
        setupLogger({ logLevel: 'info' });

        const app = new Hono();
        app.use(logger({ enableTracing: false, logLevel: 'silent' }));
        app.get('/users', (c) => c.text('ok'));

        const response = await app.request('/users');
        assert.deepEqual(response.status, 200);
        assert.deepEqual(infoOutputs.length, 0);
    } finally {
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});
