import * as E from 'fp-ts/Either';
import { z } from 'zod';
import { Event } from '../event';
import { NotFoundException } from '../exception/notFoundException';
import { RouteHandler, RouteHandlerMap } from './router';
import { AuthPolicy } from './testAuthPolicy';

export const TestEventData = z.object({
    testException: z.boolean(),
    aNumber: z.number(),
});
export type TestEventData = z.infer<typeof TestEventData>;

export const TestEvent = Event(
    z.literal('TEST_EVENT'),
    TestEventData,
    AuthPolicy,
);
export type TestEvent = z.infer<typeof TestEvent>;

export const testEventHandler: RouteHandler<TestEvent, TestEventData> = async (
    event,
) => {
    if (event.data.testException) {
        return E.left(new NotFoundException());
    }

    return E.right({
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
