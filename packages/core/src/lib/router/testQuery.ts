import type { Query } from '../message/query.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * The type for the testQuery data
 */
export type TestQueryData = {
    filter: string;
};

/**
 * A test query
 */
export const testQuery: Query<TestQueryData> = {
    specversion: '1.0',
    id: '123',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-query',
    data: {
        filter: '42',
    },
    datacontenttype: 'application/json',
};

/**
 * The handler for the TestQuery.
 */
export const testQueryHandler: RouteHandler<Query<TestQueryData>> = () => {
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
export const queryHandlerMap: RouteHandlerMap<Query<any>> = {
    'at.overlap.nimbus.test-query': {
        handler: testQueryHandler,
        allowUnsafeInput: true,
    },
};
