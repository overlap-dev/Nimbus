import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { GenericException } from '@nimbus-cqrs/core';
import { setupEventSourcingDBClient } from './client.ts';

/**
 * Starts an HTTP server that accepts requests but never answers them,
 * so every request against it stalls until the client gives up.
 */
const startStallingServer = async (): Promise<{
    server: Server;
    url: URL;
}> => {
    const server = createServer(() => {
        // Intentionally never respond.
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const { port } = server.address() as AddressInfo;

    return { server, url: new URL(`http://127.0.0.1:${port}`) };
};

const stopServer = (server: Server): Promise<void> =>
    new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
    });

test('setupEventSourcingDBClient forwards stallTimeout to the SDK client', async () => {
    const { server, url } = await startStallingServer();
    const stallTimeout = 300;

    try {
        const startedAt = performance.now();

        await assert.rejects(
            setupEventSourcingDBClient({
                url,
                apiToken: 'test-token',
                stallTimeout,
            }),
            (error: unknown) => {
                assert.ok(error instanceof GenericException);
                assert.match(error.message, /Could not connect/);
                return true;
            },
        );

        const elapsedMs = performance.now() - startedAt;

        // The SDK default stall timeout is 30 s. Failing within a few
        // seconds proves the configured 300 ms timeout was applied.
        assert.ok(
            elapsedMs >= stallTimeout,
            `Expected the ping to stall for at least ${stallTimeout}ms, took ${elapsedMs}ms`,
        );
        assert.ok(
            elapsedMs < 5000,
            `Expected the configured stallTimeout to apply, took ${elapsedMs}ms`,
        );
    } finally {
        await stopServer(server);
    }
});
