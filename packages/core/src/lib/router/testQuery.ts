import { z } from 'zod';
import { Query } from '../query/query.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * Zod schema for the TestQuery.
 */
export const TestQuery = Query(
    z.literal('test.query'),
    z.object({}),
    z.object({}),
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
