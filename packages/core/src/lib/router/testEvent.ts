import * as E from '@baetheus/fun/either';
import { z } from 'zod';
import { Event } from '../event/index.ts';
import { NotFoundException } from '../exception/notFoundException.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';
import { AuthPolicy } from './testAuthPolicy.ts';

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

export const testEventHandler: RouteHandler<TestEvent, TestEventData> = (
    event,
) => {
    if (event.data.testException) {
        return Promise.resolve(E.left(new NotFoundException()));
    }

    return Promise.resolve(E.right({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: event.data,
    }));
};

export const eventHandlerMap: RouteHandlerMap = {
    TEST_EVENT: {
        handler: testEventHandler,
        inputType: TestEvent,
    },
};
