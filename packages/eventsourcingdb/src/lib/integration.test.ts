import { createEvent, type Event } from '@nimbus/core';
import { assertEquals } from '@std/assert';
import { Container, type Event as EventSourcingDBEvent } from 'eventsourcingdb';
import { setupEventSourcingDBClient } from './client.ts';
import { eventSourcingDBEventToNimbusEvent } from './eventMapping.ts';
import { initEventObserver } from './eventObserver.ts';
import { readEvents } from './readEvents.ts';
import { writeEvents } from './writeEvents.ts';

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
                        retryOptions: {
                            maxRetries: 1,
                            initialRetryDelayMs: 100,
                        },
                    });

                    // Wait for the handler to collect both events
                    // (with a safety timeout)
                    await Promise.race([
                        allReceived,
                        new Promise<never>((_, reject) =>
                            setTimeout(
                                () =>
                                    reject(
                                        new Error(
                                            'Observer did not receive events within 5 s',
                                        ),
                                    ),
                                5000,
                            )
                        ),
                    ]);

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
        } finally {
            await container.stop();
        }
    },
});
