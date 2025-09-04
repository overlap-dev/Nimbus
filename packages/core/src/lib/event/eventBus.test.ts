import { assertEquals, assertInstanceOf } from '@std/assert';
import { GenericException } from '../exception/genericException.ts';
import type { Event } from '../message/event.ts';
import { NimbusEventBus } from './eventBus.ts';

Deno.test('EventBus rejects event that exceeds the 64KB size limit', () => {
    const eventBus = new NimbusEventBus({
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
