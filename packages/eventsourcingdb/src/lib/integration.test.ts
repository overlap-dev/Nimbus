import { createEvent, type Event } from '@nimbus-cqrs/core';
import { assert, assertEquals } from '@std/assert';
import { Container, type Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { setupEventSourcingDBClient } from './client.ts';
import { eventSourcingDBEventToNimbusEvent } from './eventMapping.ts';
import { initEventObserver, observeWithRetry } from './eventObserver.ts';
import { readEvents } from './readEvents.ts';
import { writeEvents } from './writeEvents.ts';

const withTimeout = <T>(
    promise: Promise<T>,
    ms: number,
    message: string,
): Promise<T> =>
    Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(message)), ms)
        ),
    ]);

// ---------------------------------------------------------------------------
// Shared container lifecycle
// ---------------------------------------------------------------------------

const container = new Container();

/**
 * Start the container once before all tests and stop it after.
 * We use a wrapper test with steps so the container is shared
 * across all assertions but properly cleaned up.
 */
Deno.test({
    name: 'integration: eventsourcingdb',
    // The eventsourcingdb npm Client keeps TCP connections and timers
    // alive internally; disable Deno's resource/op sanitizers for
    // this integration test.
    sanitizeResources: false,
    sanitizeOps: false,
    fn: async (t) => {
        await container.start();

        try {
            await setupEventSourcingDBClient({
                url: container.getBaseUrl(),
                apiToken: container.getApiToken(),
            });

            // -----------------------------------------------------------------
            // setupEventSourcingDBClient
            // -----------------------------------------------------------------

            await t.step(
                'setupEventSourcingDBClient connects successfully',
                () => {
                    // If we reach here, setupEventSourcingDBClient did not
                    // throw, meaning ping() and verifyApiToken() both passed.
                },
            );

            // -----------------------------------------------------------------
            // writeEvents + readEvents round-trip
            // -----------------------------------------------------------------

            await t.step(
                'writeEvents persists events that readEvents can retrieve',
                async () => {
                    const event = createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.integration',
                        subject: '/integration/1',
                        data: { key: 'value' },
                        correlationid: 'corr-integration',
                    });

                    await writeEvents([event]);

                    const readBack: EventSourcingDBEvent[] = [];

                    for await (
                        const e of readEvents('/integration/1', {
                            recursive: false,
                        })
                    ) {
                        readBack.push(e);
                    }

                    assertEquals(readBack.length, 1);
                    assertEquals(readBack[0].source, event.source);
                    assertEquals(readBack[0].type, event.type);
                    assertEquals(readBack[0].subject, event.subject);
                },
            );

            await t.step(
                'written events can be mapped back to Nimbus events',
                async () => {
                    const original = createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.roundtrip',
                        subject: '/roundtrip/1',
                        data: { message: 'round-trip' },
                        correlationid: 'corr-roundtrip',
                        dataschema: 'https://schema.example.com/v1',
                    });

                    await writeEvents([original]);

                    const readBack: Event[] = [];

                    for await (
                        const e of readEvents('/roundtrip/1', {
                            recursive: false,
                        })
                    ) {
                        readBack.push(eventSourcingDBEventToNimbusEvent(e));
                    }

                    assertEquals(readBack.length, 1);

                    const restored = readBack[0];
                    assertEquals(restored.source, original.source);
                    assertEquals(restored.type, original.type);
                    assertEquals(restored.subject, original.subject);
                    assertEquals(restored.data, original.data);
                    assertEquals(
                        restored.correlationid,
                        original.correlationid,
                    );
                    assertEquals(restored.dataschema, original.dataschema);
                },
            );

            await t.step(
                'writeEvents persists multiple events at once',
                async () => {
                    const events = [
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.batch',
                            subject: '/batch/1',
                            data: { index: 0 },
                        }),
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.batch',
                            subject: '/batch/1',
                            data: { index: 1 },
                        }),
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.batch',
                            subject: '/batch/1',
                            data: { index: 2 },
                        }),
                    ];

                    await writeEvents(events);

                    const readBack: EventSourcingDBEvent[] = [];

                    for await (
                        const e of readEvents('/batch/1', {
                            recursive: false,
                        })
                    ) {
                        readBack.push(e);
                    }

                    assertEquals(readBack.length, 3);
                },
            );

            // -----------------------------------------------------------------
            // initEventObserver
            // -----------------------------------------------------------------

            await t.step(
                'initEventObserver receives events written to the observed subject',
                async () => {
                    // Write events first so they are already stored
                    await writeEvents([
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.observer',
                            subject: '/observer/1',
                            data: { index: 0 },
                        }),
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.observer',
                            subject: '/observer/1',
                            data: { index: 1 },
                        }),
                    ]);

                    // Track events delivered to the handler
                    const received: EventSourcingDBEvent[] = [];
                    let resolveReceived: () => void;
                    const allReceived = new Promise<void>((resolve) => {
                        resolveReceived = resolve;
                    });

                    // Start observing — the observer runs in the
                    // background and will pick up the existing events.
                    initEventObserver({
                        subject: '/observer/1',
                        recursive: false,
                        eventHandler: (event) => {
                            received.push(event);
                            if (received.length >= 2) {
                                resolveReceived();
                            }
                        },
                        connectionRetryOptions: {
                            maxRetries: 1,
                            initialRetryDelayMs: 100,
                        },
                    });

                    await withTimeout(
                        allReceived,
                        5000,
                        'Observer did not receive events within 5 s',
                    );

                    assertEquals(received.length, 2);
                    assertEquals(
                        received[0].type,
                        'at.test.nimbus.observer',
                    );
                    assertEquals(
                        received[1].type,
                        'at.test.nimbus.observer',
                    );
                },
            );

            await t.step(
                'initEventObserver retries handler failures in-place',
                async () => {
                    await writeEvents([
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.handler-retry',
                            subject: '/observer/handler-retry',
                            data: { index: 0 },
                        }),
                    ]);

                    let handlerCalls = 0;
                    let resolveDone: () => void;
                    const done = new Promise<void>((resolve) => {
                        resolveDone = resolve;
                    });

                    initEventObserver({
                        subject: '/observer/handler-retry',
                        recursive: false,
                        eventHandler: () => {
                            handlerCalls++;
                            if (handlerCalls < 3) {
                                throw new Error('transient handler failure');
                            }
                            resolveDone();
                        },
                        handlerRetryOptions: {
                            maxRetries: 3,
                            initialRetryDelayMs: 10,
                        },
                    });

                    await withTimeout(
                        done,
                        5000,
                        'Handler did not succeed within 5 s',
                    );

                    assertEquals(handlerCalls, 3);
                },
            );

            await t.step(
                'initEventObserver skips poison events and continues observing',
                async () => {
                    await writeEvents([
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.poison',
                            subject: '/observer/poison',
                            data: { index: 0 },
                        }),
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.after-poison',
                            subject: '/observer/poison',
                            data: { index: 1 },
                        }),
                    ]);

                    const handledTypes: string[] = [];
                    const onHandlerErrorTypes: string[] = [];
                    let resolveDone: () => void;
                    const done = new Promise<void>((resolve) => {
                        resolveDone = resolve;
                    });

                    initEventObserver({
                        subject: '/observer/poison',
                        recursive: false,
                        eventHandler: (event) => {
                            if (event.type === 'at.test.nimbus.poison') {
                                throw new Error('poison event');
                            }
                            handledTypes.push(event.type);
                            resolveDone();
                        },
                        handlerRetryOptions: {
                            maxRetries: 2,
                            initialRetryDelayMs: 10,
                        },
                        onHandlerError: (_error, event) => {
                            onHandlerErrorTypes.push(event.type);
                        },
                    });

                    await withTimeout(
                        done,
                        5000,
                        'Observer did not continue past poison event within 5 s',
                    );

                    assertEquals(onHandlerErrorTypes, [
                        'at.test.nimbus.poison',
                    ]);
                    assertEquals(handledTypes, [
                        'at.test.nimbus.after-poison',
                    ]);
                },
            );

            // -----------------------------------------------------------------
            // Connection retries (stop/restart the real EventSourcingDB)
            // -----------------------------------------------------------------

            await t.step(
                'observeWithRetry reconnects after EventSourcingDB comes back',
                async () => {
                    // Stop first so the observer begins in a failing
                    // connection state, then bring EventSourcingDB back.
                    await container.stop();

                    const received: EventSourcingDBEvent[] = [];
                    let resolveReceived: () => void;
                    const eventReceived = new Promise<void>((resolve) => {
                        resolveReceived = resolve;
                    });

                    initEventObserver({
                        subject: '/observer/reconnect',
                        recursive: false,
                        eventHandler: (event) => {
                            received.push(event);
                            resolveReceived();
                        },
                        connectionRetryOptions: {
                            maxRetries: 20,
                            initialRetryDelayMs: 100,
                        },
                    });

                    // Let the observer attempt (and fail) at least once.
                    await new Promise((resolve) => setTimeout(resolve, 250));

                    await container.start();
                    await setupEventSourcingDBClient({
                        url: container.getBaseUrl(),
                        apiToken: container.getApiToken(),
                    });

                    await writeEvents([
                        createEvent({
                            source: 'https://nimbus.test',
                            type: 'at.test.nimbus.reconnect',
                            subject: '/observer/reconnect',
                            data: { index: 0 },
                        }),
                    ]);

                    await withTimeout(
                        eventReceived,
                        15000,
                        'Observer did not reconnect and receive an event within 15 s',
                    );

                    assertEquals(received.length, 1);
                    assertEquals(
                        received[0].type,
                        'at.test.nimbus.reconnect',
                    );
                },
            );

            await t.step(
                'observeWithRetry stops after connection retries are exhausted',
                async () => {
                    await container.stop();

                    const startedAt = Date.now();

                    await withTimeout(
                        observeWithRetry({
                            subject: '/observer/connection-exhausted',
                            recursive: false,
                            eventHandler: () => {},
                            connectionRetryOptions: {
                                maxRetries: 2,
                                initialRetryDelayMs: 50,
                            },
                        }),
                        10000,
                        'Observer did not stop after exhausting connection retries',
                    );

                    const elapsedMs = Date.now() - startedAt;

                    // Initial attempt + 2 retries with backoff; should finish
                    // quickly and must not hang until the timeout.
                    assert(
                        elapsedMs < 10000,
                        `Expected exhaustion within 10 s, took ${elapsedMs}ms`,
                    );
                },
            );

            await t.step(
                'observeWithRetry uses deprecated retryOptions for connection retries',
                async () => {
                    // Container is already stopped from the previous step.
                    assert(!container.isRunning());

                    await withTimeout(
                        observeWithRetry({
                            subject: '/observer/deprecated-retry-options',
                            recursive: false,
                            eventHandler: () => {},
                            retryOptions: {
                                maxRetries: 1,
                                initialRetryDelayMs: 50,
                            },
                        }),
                        10000,
                        'Observer did not stop when using deprecated retryOptions',
                    );
                },
            );
        } finally {
            if (container.isRunning()) {
                await container.stop();
            }
        }
    },
});
