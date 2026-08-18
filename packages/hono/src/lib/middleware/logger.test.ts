import { assertEquals, assertStringIncludes } from '@std/assert';
import { setupLogger } from '@nimbus-cqrs/core';
import { Hono } from 'hono';
import { logger } from './logger.ts';

Deno.test('logger middleware logs request and response at configured logLevel', async () => {
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
        assertEquals(response.status, 200);
        assertEquals(await response.text(), 'ok');

        assertEquals(debugOutputs.length, 2);
        assertEquals(infoOutputs.length, 0);
        assertStringIncludes(debugOutputs[0]!, 'REQ: [GET] /users');
        assertStringIncludes(debugOutputs[1]!, 'RES: [GET] /users');
    } finally {
        console.debug = originalDebug;
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});

Deno.test('logger middleware skips request and response logs when logLevel is silent', async () => {
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
        assertEquals(response.status, 200);
        assertEquals(infoOutputs.length, 0);
    } finally {
        console.info = originalInfo;
        setupLogger({ logLevel: 'silent' });
    }
});
