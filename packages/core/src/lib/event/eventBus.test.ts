import { assertInstanceOf } from '@std/assert';
import { GenericException } from '../exception/genericException.ts';
import type { Event } from './event.ts';
import { NimbusEventBus } from './eventBus.ts';

Deno.test('EventBus rejects event that exceeds the 64KB size limit', () => {
    const eventBus = new NimbusEventBus({
        maxRetries: 3,
    });

    const event: Event<string, any> = {
        specversion: '1.0',
        id: '123',
        source: 'https://nimbus.overlap.at/api/test',
        type: 'oversized.event',
        data: {
            correlationId: '123',
            payload: {
                bigData: 'x'.repeat(65 * 1024),
            },
        },
    };

    let exception: any;
    try {
        eventBus.putEvent(event);
    } catch (ex: any) {
        exception = ex;
    }

    assertInstanceOf(exception, GenericException);
});
