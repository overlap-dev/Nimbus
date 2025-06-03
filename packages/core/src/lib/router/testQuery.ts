import { z } from 'zod';
import { CloudEvent } from '../cloudEvent/index.ts';
import { MessageEnvelope } from '../messageEnvelope.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * Zod schema for the TestQuery.
 *
 * TODO: We should still declare the Query and Command as its own type using CloudEvent and MessageEnvelope
 */
export const TestQuery = CloudEvent(
    z.literal('test.query'),
    MessageEnvelope(z.object({}), z.object({})),
);

/**
 * The type of the TestQuery.
 */
export type TestQuery = z.infer<typeof TestQuery>;

/**
 * The handler for the TestQuery.
 */
export const testQueryHandler: RouteHandler<TestQuery, any> = () => {
    return Promise.resolve({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            foo: 'bar',
        },
    });
};

/**
 * The handler map for the TestQuery.
 */
export const queryHandlerMap: RouteHandlerMap = {
    'test.query': {
        handler: testQueryHandler,
        inputType: TestQuery,
    },
};
