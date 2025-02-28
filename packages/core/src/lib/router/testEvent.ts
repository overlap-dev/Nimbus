import { z } from 'zod';
import { EventMetadata } from '../../index.ts';
import { Event } from '../event/index.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * Zod schema for the TestEventData.
 */
export const TestEventData = z.object({
    testException: z.boolean(),
    aNumber: z.number(),
});

/**
 * The type of the TestEventData.
 */
export type TestEventData = z.infer<typeof TestEventData>;

/**
 * Zod schema for the TestEvent.
 */
export const TestEvent = Event(
    z.literal('TEST_EVENT'),
    TestEventData,
    EventMetadata(z.record(z.string(), z.string())),
);

/**
 * The type of the TestEvent.
 */
export type TestEvent = z.infer<typeof TestEvent>;

/**
 * The handler for the TestEvent.
 */
export const testEventHandler: RouteHandler<TestEvent, TestEventData> = (
    event,
) => {
    if (event.data.testException) {
        throw new NotFoundException();
    }

    return Promise.resolve({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: event.data,
    });
};

/**
 * The handler map for the TestEvent.
 */
export const eventHandlerMap: RouteHandlerMap = {
    TEST_EVENT: {
        handler: testEventHandler,
        inputType: TestEvent,
    },
};
