import * as E from 'fp-ts/Either';
import { z } from 'zod';
import { Query } from '../query';
import { RouteHandler, RouteHandlerMap } from './router';
import { AuthPolicy } from './testAuthPolicy';

export const TestQuery = Query(
    z.literal('TEST_QUERY'),
    AuthPolicy,
    z.object({}),
);
export type TestQuery = z.infer<typeof TestQuery>;

export const testQueryHandler: RouteHandler<TestQuery, any> = async () => {
    return E.right({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            foo: 'bar',
        },
    });
};

export const queryHandlerMap: RouteHandlerMap = {
    TEST_QUERY: {
        handler: testQueryHandler,
        inputType: TestQuery,
    },
};
