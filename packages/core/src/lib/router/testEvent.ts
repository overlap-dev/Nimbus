import { z } from 'zod';
import { EventMetadata } from '../../index.ts';
import { Event } from '../event/index.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

export const TestEventData = z.object({
    testException: z.boolean(),
    aNumber: z.number(),
});
export type TestEventData = z.infer<typeof TestEventData>;

export const TestEvent = Event(
    z.literal('TEST_EVENT'),
    TestEventData,
    EventMetadata(z.record(z.string(), z.string())),
);
export type TestEvent = z.infer<typeof TestEvent>;

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

export const eventHandlerMap: RouteHandlerMap = {
    TEST_EVENT: {
        handler: testEventHandler,
        inputType: TestEvent,
    },
};
