import { assertEquals, assertExists, assertInstanceOf } from '@std/assert';
import { GenericException } from '../exception/genericException.ts';
import type { Event } from '../message/event.ts';
import { getEventBus, NimbusEventBus, setupEventBus } from './eventBus.ts';

/**
 * Helper function to create a valid test event.
 */
const createTestEvent = (
    type: string,
    data?: Record<string, unknown>,
): Event => ({
    specversion: '1.0',
    id: crypto.randomUUID(),
    correlationid: crypto.randomUUID(),
    time: new Date().toISOString(),
    source: 'https://test.nimbus.overlap.at',
    type,
    subject: '/test',
    data: data ?? { testData: 'value' },
});

Deno.test('EventBus rejects event that exceeds the 64KB size limit', () => {
    const eventBus = new NimbusEventBus({
        name: 'size-test',
        maxRetries: 3,
    });

    const event: Event = {
        specversion: '1.0',
        id: '123',
        correlationid: '456',
        time: '2025-01-01T00:00:00Z',
        source: 'https://nimbus.overlap.at',
        type: 'at.overlap.nimbus.test-event',
        subject: '/test',
        data: {
            bigData: 'x'.repeat(65 * 1024),
        },
    };

    let exception: any;
    try {
        eventBus.putEvent(event);
    } catch (ex: any) {
        exception = ex;
    }

    assertInstanceOf(exception, GenericException);
    assertEquals(exception.message, 'Event size exceeds the limit of 64KB');
});

Deno.test('EventBus delivers event to subscriber', async () => {
    const eventBus = new NimbusEventBus({ name: 'deliver-test' });
    let receivedEvent: Event | undefined;

    eventBus.subscribeEvent({
        type: 'test.event.deliver',
        handler: (event) => {
            receivedEvent = event;
            return Promise.resolve();
        },
    });

    const testEvent = createTestEvent('test.event.deliver', {
        message: 'hello',
    });
    eventBus.putEvent(testEvent);

    // Wait for async handler to complete
    await new Promise((r) => setTimeout(r, 50));

    assertExists(receivedEvent);
    assertEquals(receivedEvent.type, 'test.event.deliver');
    assertEquals(
        (receivedEvent.data as Record<string, unknown>).message,
        'hello',
    );
});

Deno.test('EventBus delivers event to multiple subscribers', async () => {
    const eventBus = new NimbusEventBus({ name: 'multi-sub-test' });
    const receivedEvents: Event[] = [];

    // First subscriber
    eventBus.subscribeEvent({
        type: 'test.event.multi',
        handler: (event) => {
            receivedEvents.push(event);
            return Promise.resolve();
        },
    });

    // Second subscriber
    eventBus.subscribeEvent({
        type: 'test.event.multi',
        handler: (event) => {
            receivedEvents.push(event);
            return Promise.resolve();
        },
    });

    const testEvent = createTestEvent('test.event.multi');
    eventBus.putEvent(testEvent);

    // Wait for async handlers to complete
    await new Promise((r) => setTimeout(r, 50));

    assertEquals(receivedEvents.length, 2);
    assertEquals(receivedEvents[0].id, testEvent.id);
    assertEquals(receivedEvents[1].id, testEvent.id);
});

Deno.test('EventBus retries on handler failure and eventually succeeds', async () => {
    const eventBus = new NimbusEventBus({
        name: 'retry-success-test',
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        useJitter: false,
    });
    let attempts = 0;

    eventBus.subscribeEvent({
        type: 'test.event.retry-success',
        handler: () => {
            attempts++;
            if (attempts < 3) {
                return Promise.reject(new Error('Temporary failure'));
            }
            // Succeeds on 3rd attempt
            return Promise.resolve();
        },
    });

    const testEvent = createTestEvent('test.event.retry-success');
    eventBus.putEvent(testEvent);

    // Wait for retries to complete (base delay * 2^0 + base delay * 2^1 = 10 + 20 = 30ms + buffer)
    await new Promise((r) => setTimeout(r, 200));

    assertEquals(attempts, 3);
});

Deno.test('EventBus exhausts retries and invokes onError callback', async () => {
    const eventBus = new NimbusEventBus({
        name: 'retry-exhausted-test',
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
        useJitter: false,
    });
    let attempts = 0;
    let errorReceived: Error | undefined;
    let eventReceived: Event | undefined;

    eventBus.subscribeEvent({
        type: 'test.event.retry-exhausted',
        handler: () => {
            attempts++;
            return Promise.reject(new Error('Always fails'));
        },
        onError: (error, event) => {
            errorReceived = error;
            eventReceived = event;
        },
    });

    const testEvent = createTestEvent('test.event.retry-exhausted');
    eventBus.putEvent(testEvent);

    // Wait for all retries to exhaust
    await new Promise((r) => setTimeout(r, 200));

    // Initial attempt + 2 retries = 3 total attempts
    assertEquals(attempts, 3);
    assertInstanceOf(errorReceived, GenericException);
    assertExists(eventReceived);
    assertEquals(eventReceived.id, testEvent.id);
});

Deno.test('EventBus onError callback receives error and event', async () => {
    const eventBus = new NimbusEventBus({
        name: 'onerror-test',
        maxRetries: 0,
        baseDelay: 10,
    });
    let errorMessage: string | undefined;
    let eventType: string | undefined;

    eventBus.subscribeEvent({
        type: 'test.event.onerror',
        handler: () => {
            return Promise.reject(new Error('Handler error'));
        },
        onError: (error, event) => {
            errorMessage = error.message;
            eventType = event.type;
        },
    });

    const testEvent = createTestEvent('test.event.onerror');
    eventBus.putEvent(testEvent);

    // Wait for handler to fail
    await new Promise((r) => setTimeout(r, 50));

    assertEquals(
        errorMessage,
        'Failed to handle event: test.event.onerror from https://test.nimbus.overlap.at',
    );
    assertEquals(eventType, 'test.event.onerror');
});

Deno.test('setupEventBus creates and registers an EventBus instance', () => {
    setupEventBus('test-setup-bus', { maxRetries: 5 });
    const bus = getEventBus('test-setup-bus');

    assertInstanceOf(bus, NimbusEventBus);
});

Deno.test('getEventBus creates default instance if not found', () => {
    const bus = getEventBus('test-new-bus-' + crypto.randomUUID());

    assertInstanceOf(bus, NimbusEventBus);
});

Deno.test('getEventBus returns same instance on repeated calls', () => {
    const busName = 'test-same-instance-' + crypto.randomUUID();
    const bus1 = getEventBus(busName);
    const bus2 = getEventBus(busName);

    assertEquals(bus1, bus2);
});

Deno.test('Multiple named EventBus instances are independent', async () => {
    const ordersBus = new NimbusEventBus({ name: 'orders-independent' });
    const notificationsBus = new NimbusEventBus({
        name: 'notifications-independent',
    });

    let ordersReceived = 0;
    let notificationsReceived = 0;

    ordersBus.subscribeEvent({
        type: 'test.event.independent',
        handler: () => {
            ordersReceived++;
            return Promise.resolve();
        },
    });

    notificationsBus.subscribeEvent({
        type: 'test.event.independent',
        handler: () => {
            notificationsReceived++;
            return Promise.resolve();
        },
    });

    // Publish to orders bus only
    ordersBus.putEvent(createTestEvent('test.event.independent'));

    await new Promise((r) => setTimeout(r, 50));

    assertEquals(ordersReceived, 1);
    assertEquals(notificationsReceived, 0);
});

Deno.test('EventBus logPublish callback is invoked when publishing an event', () => {
    const loggedEvents: Event[] = [];

    const eventBus = new NimbusEventBus({
        name: 'log-publish-test',
        logPublish: (event) => {
            loggedEvents.push(event);
        },
    });

    const testEvent = createTestEvent('test.event.log-publish', {
        message: 'logged',
    });
    eventBus.putEvent(testEvent);

    assertEquals(loggedEvents.length, 1);
    assertEquals(loggedEvents[0].id, testEvent.id);
    assertEquals(loggedEvents[0].type, 'test.event.log-publish');
    assertEquals(
        (loggedEvents[0].data as Record<string, unknown>).message,
        'logged',
    );
});

Deno.test('EventBus logPublish callback receives correct event for each publish', () => {
    const loggedEvents: Event[] = [];

    const eventBus = new NimbusEventBus({
        name: 'log-publish-multi-test',
        logPublish: (event) => {
            loggedEvents.push(event);
        },
    });

    const event1 = createTestEvent('test.event.first');
    const event2 = createTestEvent('test.event.second');
    const event3 = createTestEvent('test.event.third');

    eventBus.putEvent(event1);
    eventBus.putEvent(event2);
    eventBus.putEvent(event3);

    assertEquals(loggedEvents.length, 3);
    assertEquals(loggedEvents[0].type, 'test.event.first');
    assertEquals(loggedEvents[1].type, 'test.event.second');
    assertEquals(loggedEvents[2].type, 'test.event.third');
});

Deno.test('EventBus works without logPublish callback', () => {
    const eventBus = new NimbusEventBus({
        name: 'no-log-publish-test',
    });

    // Should not throw when logPublish is not provided
    const testEvent = createTestEvent('test.event.no-log');
    eventBus.putEvent(testEvent);
});
