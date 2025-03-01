import { z } from 'zod';
import { Query } from '../query/index.ts';
import { QueryMetadata } from '../query/queryMetadata.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * Zod schema for the TestQuery.
 */
export const TestQuery = Query(
    z.literal('TEST_QUERY'),
    z.object({}),
    QueryMetadata(z.record(z.string(), z.string())),
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
    TEST_QUERY: {
        handler: testQueryHandler,
        inputType: TestQuery,
    },
};
