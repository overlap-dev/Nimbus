import assert from 'node:assert/strict';
import { type TestContext, test } from 'node:test';
import {
    type CheckpointStore,
    createEvent,
    type Event,
    InMemoryCheckpointStore,
} from '@nimbus-cqrs/core';
import {
    Container,
    DbApiError,
    ErrorCode,
    type Event as EventSourcingDBEvent,
    isSubjectPristine,
} from 'eventsourcingdb';
import { setupEventSourcingDBClient } from './client.ts';
import { eventSourcingDBEventToNimbusEvent } from './eventMapping.ts';
import { initEventObserver } from './eventObserver.ts';
import { getEventObserver } from './observerRegistry.ts';
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

/**
 * Polls `condition` until it holds or `ms` have passed.
 */
const waitFor = async (
    condition: () => boolean,
    ms: number,
    message: string,
): Promise<void> => {
    const deadline = Date.now() + ms;

    while (!condition()) {
        if (Date.now() > deadline) {
            throw new Error(message);
        }

        await new Promise((resolve) => setTimeout(resolve, 25));
    }
};

// ---------------------------------------------------------------------------
// Shared container lifecycle
// ---------------------------------------------------------------------------

/**
 * The EventSourcingDB Docker image tags the suite runs against. `1.2.0`
 * only offers the v1 HTTP API, `preview` is the upcoming 1.3 release with
 * the v2 HTTP API. The SDK detects the API at runtime, so the same
 * assertions have to hold for both.
 */
const imageTags = ['1.2.0', 'preview'];

/**
 * Start the container once before all tests and stop it after.
 * We use a wrapper test with subtests so the container is shared
 * across all assertions but properly cleaned up.
 */
const runIntegrationSuite = async (
    t: TestContext,
    container: Container,
    // Observer names are registered process-wide, so every suite run
    // needs its own prefix.
    suite: string,
): Promise<void> => {
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
            'initEventObserver feeds stored events to its consumers and resumes from the checkpoint',
            async () => {
                const subject = `/observer/${suite}/basic`;

                // Write events first so they are already stored
                await writeEvents([
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.observer',
                        subject,
                        data: { index: 0 },
                    }),
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.observer',
                        subject,
                        data: { index: 1 },
                    }),
                ]);

                const checkpointStore = new InMemoryCheckpointStore();
                const received: Event[] = [];
                const rawReceived: EventSourcingDBEvent[] = [];
                let resolveReceived: () => void;
                const allReceived = new Promise<void>((resolve) => {
                    resolveReceived = resolve;
                });

                const consumerName = `${suite}.basic`;

                const observer = await initEventObserver({
                    name: `${suite}-basic`,
                    subject,
                    recursive: false,
                    checkpointStore,
                    consumers: [
                        {
                            name: consumerName,
                            handles: () => true,
                            handle: (event, raw) => {
                                received.push(event);
                                rawReceived.push(raw);
                                if (received.length >= 2) {
                                    resolveReceived();
                                }
                                return Promise.resolve();
                            },
                        },
                    ],
                    connectionRetryOptions: {
                        maxRetries: 1,
                        initialRetryDelayMs: 100,
                    },
                });

                assert.deepEqual(observer.status().phase, 'catching-up');

                await withTimeout(
                    allReceived,
                    5000,
                    'Observer did not receive events within 5 s',
                );

                assert.deepEqual(received.length, 2);
                assert.deepEqual(received[0].type, 'at.test.nimbus.observer');
                assert.deepEqual(received[0].data, { index: 0 });
                assert.deepEqual(received[1].data, { index: 1 });
                assert.deepEqual(rawReceived[1].id, received[1].id);

                await waitFor(
                    () => observer.status().phase === 'live',
                    5000,
                    'Observer did not switch to live within 5 s',
                );
                assert.deepEqual(observer.healthCheck(), {
                    status: 'healthy',
                });

                const checkpoint = (
                    await checkpointStore.load([consumerName])
                ).get(consumerName);
                assert.deepEqual(checkpoint?.position, received[1].id);

                // A second observer on the same checkpoint store resumes
                // after the stored position and only sees the new event.
                // It has to start before the event is written: the first
                // observer is still running and would move the shared
                // checkpoint past it otherwise.
                const resumed: Event[] = [];
                let resolveResumed: () => void;
                const resumedReceived = new Promise<void>((resolve) => {
                    resolveResumed = resolve;
                });

                const resumedObserver = await initEventObserver({
                    name: `${suite}-resumed`,
                    subject,
                    recursive: false,
                    checkpointStore,
                    consumers: [
                        {
                            name: consumerName,
                            handles: () => true,
                            handle: (event) => {
                                resumed.push(event);
                                resolveResumed();
                                return Promise.resolve();
                            },
                        },
                    ],
                });

                assert.deepEqual(resumedObserver.status().phase, 'live');

                await writeEvents([
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.observer',
                        subject,
                        data: { index: 2 },
                    }),
                ]);

                await withTimeout(
                    resumedReceived,
                    5000,
                    'Resumed observer did not receive the new event within 5 s',
                );

                assert.deepEqual(
                    resumed.map((event) => event.data),
                    [{ index: 2 }],
                );
                assert.deepEqual(
                    getEventObserver(`${suite}-resumed`),
                    resumedObserver,
                );
            },
        );

        await t.test(
            'a head consumer only sees new events and ignores its stored checkpoint on restart',
            async () => {
                const subject = `/observer/${suite}/head`;
                const type = 'at.test.nimbus.head';
                const write = (index: number) => {
                    return writeEvents([
                        createEvent({
                            source: 'https://nimbus.test',
                            type,
                            subject,
                            data: { index },
                        }),
                    ]);
                };

                await write(0);
                await write(1);

                const checkpointStore = new InMemoryCheckpointStore();
                const projectionName = `${suite}.head.projection`;
                const liveName = `${suite}.head.live`;
                const projected: number[] = [];
                const live: number[] = [];

                const liveConsumer = (sink: number[], dependsOn: string[]) => {
                    return {
                        name: liveName,
                        startFrom: 'head' as const,
                        dependsOn,
                        handles: () => true,
                        handle: (event: Event) => {
                            sink.push((event.data as { index: number }).index);
                            return Promise.resolve();
                        },
                    };
                };

                await initEventObserver({
                    name: `${suite}-head`,
                    subject,
                    recursive: false,
                    checkpointStore,
                    consumers: [
                        {
                            name: projectionName,
                            handles: () => true,
                            handle: (event) => {
                                projected.push(
                                    (event.data as { index: number }).index,
                                );
                                return Promise.resolve();
                            },
                        },
                        liveConsumer(live, [projectionName]),
                    ],
                });

                await waitFor(
                    () => projected.length === 2,
                    5000,
                    'Projection did not replay the stored events within 5 s',
                );
                assert.deepEqual(live, []);

                // The live consumer's checkpoint is now at the head. A
                // second observer on the same store starts the live
                // consumer at the current head again instead of resuming
                // after the stored position.
                const restartedLive: number[] = [];

                await initEventObserver({
                    name: `${suite}-head-restarted`,
                    subject,
                    recursive: false,
                    checkpointStore,
                    consumers: [liveConsumer(restartedLive, [])],
                });

                await write(2);

                await waitFor(
                    () => live.length === 1 && restartedLive.length === 1,
                    5000,
                    'Live consumers did not receive the new event within 5 s',
                );

                assert.deepEqual(projected, [0, 1, 2]);
                assert.deepEqual(live, [2]);
                assert.deepEqual(restartedLive, [2]);
            },
        );

        await t.test(
            'initEventObserver retries consumer failures in-place',
            async () => {
                const subject = `/observer/${suite}/handler-retry`;

                await writeEvents([
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.handler-retry',
                        subject,
                        data: { index: 0 },
                    }),
                ]);

                const checkpointStore = new InMemoryCheckpointStore();
                let handlerCalls = 0;
                let resolveDone: () => void;
                const done = new Promise<void>((resolve) => {
                    resolveDone = resolve;
                });

                const observer = await initEventObserver({
                    name: `${suite}-handler-retry`,
                    subject,
                    recursive: false,
                    checkpointStore,
                    consumers: [
                        {
                            name: `${suite}.handler-retry`,
                            handles: () => true,
                            handle: () => {
                                handlerCalls++;
                                if (handlerCalls < 3) {
                                    throw new Error(
                                        'transient handler failure',
                                    );
                                }
                                resolveDone();
                                return Promise.resolve();
                            },
                        },
                    ],
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

                await waitFor(
                    () => observer.status().consumers[0]?.position !== null,
                    5000,
                    'Checkpoint was not advanced within 5 s',
                );
                assert.deepEqual(observer.status().consumers[0]?.halted, false);
            },
        );

        await t.test(
            'initEventObserver halts a failing consumer while its sibling continues',
            async () => {
                const subject = `/observer/${suite}/poison`;

                await writeEvents([
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.poison',
                        subject,
                        data: { index: 0 },
                    }),
                    createEvent({
                        source: 'https://nimbus.test',
                        type: 'at.test.nimbus.after-poison',
                        subject,
                        data: { index: 1 },
                    }),
                ]);

                const checkpointStore = new InMemoryCheckpointStore();
                const failingName = `${suite}.poison-failing`;
                const siblingName = `${suite}.poison-sibling`;
                const failingHandled: string[] = [];
                const siblingHandled: string[] = [];
                let resolveDone: () => void;
                const done = new Promise<void>((resolve) => {
                    resolveDone = resolve;
                });

                const observer = await initEventObserver({
                    name: `${suite}-poison`,
                    subject,
                    recursive: false,
                    checkpointStore,
                    consumers: [
                        {
                            name: failingName,
                            handles: () => true,
                            handle: (event) => {
                                failingHandled.push(event.type);
                                if (event.type === 'at.test.nimbus.poison') {
                                    throw new Error('poison event');
                                }
                                return Promise.resolve();
                            },
                        },
                        {
                            name: siblingName,
                            handles: () => true,
                            handle: (event) => {
                                siblingHandled.push(event.type);
                                if (
                                    event.type === 'at.test.nimbus.after-poison'
                                ) {
                                    resolveDone();
                                }
                                return Promise.resolve();
                            },
                        },
                    ],
                    handlerRetryOptions: {
                        maxRetries: 2,
                        initialRetryDelayMs: 10,
                    },
                });

                await withTimeout(
                    done,
                    5000,
                    'Observer did not continue past the poison event within 5 s',
                );

                // The failing consumer was retried in place (initial attempt
                // + 2 retries) and never saw the following event.
                assert.deepEqual(failingHandled, [
                    'at.test.nimbus.poison',
                    'at.test.nimbus.poison',
                    'at.test.nimbus.poison',
                ]);
                assert.deepEqual(siblingHandled, [
                    'at.test.nimbus.poison',
                    'at.test.nimbus.after-poison',
                ]);

                const status = observer.status();
                const failing = status.consumers.find(
                    (consumer) => consumer.name === failingName,
                );
                const sibling = status.consumers.find(
                    (consumer) => consumer.name === siblingName,
                );

                assert.deepEqual(failing?.halted, true);
                assert.deepEqual(failing?.position, null);
                assert.deepEqual(
                    failing?.failure?.error,
                    'Error: poison event',
                );
                assert.deepEqual(sibling?.halted, false);
                assert.notEqual(sibling?.position, null);

                assert.deepEqual(observer.healthCheck(), {
                    status: 'error',
                    details: `Halted consumer(s): ${failingName}`,
                });

                const checkpoints = await checkpointStore.load([
                    failingName,
                    siblingName,
                ]);
                assert.deepEqual(
                    checkpoints.get(failingName)?.position,
                    undefined,
                );
                assert.deepEqual(
                    checkpoints.get(failingName)?.failure?.position,
                    failing?.failure?.position,
                );
                assert.deepEqual(
                    checkpoints.get(siblingName)?.position,
                    sibling?.position,
                );
            },
        );

        await t.test(
            'initEventObserver rejects when the checkpoint store cannot be read',
            async () => {
                const brokenStore: CheckpointStore = {
                    load: () => Promise.reject(new Error('store down')),
                    save: () => Promise.resolve(),
                    reset: () => Promise.resolve(),
                };

                await assert.rejects(
                    initEventObserver({
                        name: `${suite}-broken-store`,
                        subject: `/observer/${suite}/broken-store`,
                        checkpointStore: brokenStore,
                        consumers: [
                            {
                                name: `${suite}.broken-store`,
                                handles: () => true,
                                handle: () => Promise.resolve(),
                            },
                        ],
                    }),
                    /store down/,
                );
            },
        );

        // -----------------------------------------------------------------
        // Connection retries (stop/restart the real EventSourcingDB)
        // -----------------------------------------------------------------

        await t.test(
            'initEventObserver reconnects after EventSourcingDB comes back',
            async () => {
                const subject = `/observer/${suite}/reconnect`;
                const received: Event[] = [];
                let resolveReceived: () => void;
                const eventReceived = new Promise<void>((resolve) => {
                    resolveReceived = resolve;
                });

                const observer = await initEventObserver({
                    name: `${suite}-reconnect`,
                    subject,
                    recursive: false,
                    checkpointStore: new InMemoryCheckpointStore(),
                    consumers: [
                        {
                            name: `${suite}.reconnect`,
                            handles: () => true,
                            handle: (event) => {
                                received.push(event);
                                resolveReceived();
                                return Promise.resolve();
                            },
                        },
                    ],
                    connectionRetryOptions: {
                        maxRetries: 20,
                        initialRetryDelayMs: 100,
                    },
                });

                // Restart EventSourcingDB so the observer begins to fail
                // its connection, then bring it back.
                await container.stop();
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
                        subject,
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
                assert.deepEqual(observer.healthCheck().status, 'healthy');
            },
        );

        await t.test(
            'initEventObserver stops after connection retries are exhausted',
            async () => {
                // An idle observe stream only notices a vanished server
                // through the stall timeout. Keep it short so the test does
                // not depend on how the image closes connections on stop.
                await setupEventSourcingDBClient({
                    url: container.getBaseUrl(),
                    apiToken: container.getApiToken(),
                    stallTimeout: 1000,
                });

                const observer = await initEventObserver({
                    name: `${suite}-connection-exhausted`,
                    subject: `/observer/${suite}/connection-exhausted`,
                    recursive: false,
                    checkpointStore: new InMemoryCheckpointStore(),
                    consumers: [
                        {
                            name: `${suite}.connection-exhausted`,
                            handles: () => true,
                            handle: () => Promise.resolve(),
                        },
                    ],
                    connectionRetryOptions: {
                        maxRetries: 2,
                        initialRetryDelayMs: 50,
                    },
                });

                await container.stop();

                // Stall detection + initial attempt + 2 retries with
                // backoff; must not hang until the timeout.
                await waitFor(
                    () => observer.status().phase === 'stopped',
                    15000,
                    'Observer did not stop after exhausting connection retries',
                );

                assert.deepEqual(observer.healthCheck().status, 'error');
                assert.match(
                    observer.healthCheck().details ?? '',
                    /connection retries/,
                );
            },
        );
    } finally {
        if (container.isRunning()) {
            await container.stop();
        }
    }
};

/**
 * The eventsourcingdb npm Client keeps TCP connections and timers alive
 * internally, so the package's `test` script runs with `--test-force-exit`.
 */
test('integration: eventsourcingdb', async (t) => {
    // Run sequentially: the client singleton is re-initialized per
    // container, so the previous one has to be stopped first.
    for (const imageTag of imageTags) {
        await t.test(`EventSourcingDB ${imageTag}`, async (t) => {
            await runIntegrationSuite(
                t,
                new Container().withImageTag(imageTag),
                `esdb-${imageTag.replaceAll('.', '-')}`,
            );
        });
    }
});
