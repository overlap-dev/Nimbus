import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEvent, type Event } from '@nimbus-cqrs/core';
import {
    Container,
    DbApiError,
    ErrorCode,
    type Event as EventSourcingDBEvent,
    isSubjectPristine,
} from 'eventsourcingdb';
import { setupEventSourcingDBClient } from './client.ts';
import { eventSourcingDBEventToNimbusEvent } from './eventMapping.ts';
import { initEventObserver, observeWithRetry } from './eventObserver.ts';
import { readEvents } from './readEvents.ts';
import { writeEvents } from './writeEvents.ts';

const withTimeout = <T>(
    promise: Promise<T>,
    ms: number,
    message: string,
): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    return new Promise<T>((resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error(message));
        }, ms);

        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
};

// ---------------------------------------------------------------------------
// Shared container lifecycle
// ---------------------------------------------------------------------------

const container = new Container();

/**
 * Start the container once before all tests and stop it after.
 * We use a wrapper test with subtests so the container is shared
 * across all assertions but properly cleaned up.
 *
 * The eventsourcingdb npm Client keeps TCP connections and timers alive
 * internally, so the package's `test` script runs with `--test-force-exit`.
 */
test('integration: eventsourcingdb', async (t) => {
    await container.start();

    try {
        await setupEventSourcingDBClient({
            url: container.getBaseUrl(),
            apiToken: container.getApiToken(),
        });

        // -----------------------------------------------------------------
        // setupEventSourcingDBClient
        // -----------------------------------------------------------------

        await t.test('setupEventSourcingDBClient connects successfully', () => {
            // If we reach here, setupEventSourcingDBClient did not
            // throw, meaning ping() and verifyApiToken() both passed.
        });

        // -----------------------------------------------------------------
        // writeEvents + readEvents round-trip
        // -----------------------------------------------------------------

        await t.test(
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

                for await (const e of readEvents('/integration/1', {
                    recursive: false,
                })) {
                    readBack.push(e);
                }

                assert.deepEqual(readBack.length, 1);
                assert.deepEqual(readBack[0].source, event.source);
                assert.deepEqual(readBack[0].type, event.type);
                assert.deepEqual(readBack[0].subject, event.subject);
            },
        );

        await t.test(
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

                for await (const e of readEvents('/roundtrip/1', {
                    recursive: false,
                })) {
                    readBack.push(eventSourcingDBEventToNimbusEvent(e));
                }

                assert.deepEqual(readBack.length, 1);

                const restored = readBack[0];
                assert.deepEqual(restored.source, original.source);
                assert.deepEqual(restored.type, original.type);
                assert.deepEqual(restored.subject, original.subject);
                assert.deepEqual(restored.data, original.data);
                assert.deepEqual(
                    restored.correlationid,
                    original.correlationid,
                );
                assert.deepEqual(restored.dataschema, original.dataschema);
            },
        );

        await t.test(
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

                for await (const e of readEvents('/batch/1', {
                    recursive: false,
                })) {
                    readBack.push(e);
                }

                assert.deepEqual(readBack.length, 3);
            },
        );

        await t.test(
            'writeEvents returns the written events with server-assigned fields',
            async () => {
                const events = [
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.written',
                        subject: '/written/1',
                        data: { index: 0 },
                    }),
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.written',
                        subject: '/written/1',
                        data: { index: 1 },
                    }),
                ];

                const writtenEvents = await writeEvents(events);

                assert.deepEqual(writtenEvents.length, 2);

                for (const [index, writtenEvent] of writtenEvents.entries()) {
                    assert.deepEqual(typeof writtenEvent.id, 'string');
                    assert.ok(writtenEvent.id.length > 0);
                    assert.ok(writtenEvent.time instanceof Date);
                    assert.deepEqual(writtenEvent.type, events[index].type);
                    assert.deepEqual(
                        writtenEvent.subject,
                        events[index].subject,
                    );
                }

                assert.notDeepEqual(writtenEvents[0].id, writtenEvents[1].id);
            },
        );

        await t.test(
            'writeEvents throws a DbApiError with preconditionViolated when a precondition does not hold',
            async () => {
                const subject = '/precondition/1';

                await writeEvents([
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.precondition',
                        subject,
                        data: { index: 0 },
                    }),
                ]);

                await assert.rejects(
                    writeEvents(
                        [
                            createEvent({
                                source: 'https://nimbus.test',
                                type: 'at.test.nimbus.precondition',
                                subject,
                                data: { index: 1 },
                            }),
                        ],
                        [isSubjectPristine(subject)],
                    ),
                    (error: unknown) => {
                        assert.ok(error instanceof DbApiError);
                        assert.deepEqual(
                            error.code,
                            ErrorCode.preconditionViolated,
                        );
                        return true;
                    },
                );
            },
        );

        await t.test(
            'writeEvents rejects with the abort reason and persists nothing when the signal is already aborted',
            async () => {
                const subject = '/aborted/1';
                const abortReason = new Error('write cancelled by test');
                const controller = new AbortController();
                controller.abort(abortReason);

                await assert.rejects(
                    writeEvents(
                        [
                            createEvent({
                                source: 'https://nimbus.test',
                                type: 'at.test.nimbus.aborted',
                                subject,
                                data: { index: 0 },
                            }),
                        ],
                        undefined,
                        controller.signal,
                    ),
                    (error: unknown) => {
                        assert.deepEqual(error, abortReason);
                        return true;
                    },
                );

                const readBack: EventSourcingDBEvent[] = [];

                for await (const e of readEvents(subject, {
                    recursive: false,
                })) {
                    readBack.push(e);
                }

                assert.deepEqual(readBack.length, 0);
            },
        );

        // -----------------------------------------------------------------
        // initEventObserver
        // -----------------------------------------------------------------

        await t.test(
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

                assert.deepEqual(received.length, 2);
                assert.deepEqual(received[0].type, 'at.test.nimbus.observer');
                assert.deepEqual(received[1].type, 'at.test.nimbus.observer');
            },
        );

        await t.test(
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

                assert.deepEqual(handlerCalls, 3);
            },
        );

        await t.test(
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

                assert.deepEqual(onHandlerErrorTypes, [
                    'at.test.nimbus.poison',
                ]);
                assert.deepEqual(handledTypes, ['at.test.nimbus.after-poison']);
            },
        );

        await t.test(
            'initEventObserver skips event when onHandlerError throws',
            async () => {
                await writeEvents([
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.on-error-throw',
                        subject: '/observer/on-handler-error-throw',
                        data: { index: 0 },
                    }),
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.after-on-error-throw',
                        subject: '/observer/on-handler-error-throw',
                        data: { index: 1 },
                    }),
                ]);

                const handledTypes: string[] = [];
                let onHandlerErrorCalls = 0;
                let resolveDone: () => void;
                const done = new Promise<void>((resolve) => {
                    resolveDone = resolve;
                });

                initEventObserver({
                    subject: '/observer/on-handler-error-throw',
                    recursive: false,
                    eventHandler: (event) => {
                        if (event.type === 'at.test.nimbus.on-error-throw') {
                            throw new Error('poison event');
                        }
                        handledTypes.push(event.type);
                        resolveDone();
                    },
                    handlerRetryOptions: {
                        maxRetries: 1,
                        initialRetryDelayMs: 10,
                    },
                    onHandlerError: () => {
                        onHandlerErrorCalls++;
                        throw new Error('onHandlerError failed');
                    },
                });

                await withTimeout(
                    done,
                    5000,
                    'Observer did not continue after onHandlerError threw within 5 s',
                );

                assert.deepEqual(onHandlerErrorCalls, 1);
                assert.deepEqual(handledTypes, [
                    'at.test.nimbus.after-on-error-throw',
                ]);
            },
        );

        // -----------------------------------------------------------------
        // Connection retries (stop/restart the real EventSourcingDB)
        // -----------------------------------------------------------------

        await t.test(
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

                assert.deepEqual(received.length, 1);
                assert.deepEqual(received[0].type, 'at.test.nimbus.reconnect');
            },
        );

        await t.test(
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
                assert.ok(
                    elapsedMs < 10000,
                    `Expected exhaustion within 10 s, took ${elapsedMs}ms`,
                );
            },
        );

        await t.test(
            'observeWithRetry uses deprecated retryOptions for connection retries',
            async () => {
                // Container is already stopped from the previous step.
                assert.ok(!container.isRunning());

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
});
