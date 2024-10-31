import * as E from '@baetheus/fun/either';
import { z } from 'zod';
import { Command } from '../command/index.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';
import { AuthPolicy } from './testAuthPolicy.ts';

export const TestCommandData = z.object({
    aNumber: z.number(),
});
export type TestCommandData = z.infer<typeof TestCommandData>;

export const TestCommand = Command(
    z.literal('TEST_COMMAND'),
    TestCommandData,
    AuthPolicy,
);
export type TestCommand = z.infer<typeof TestCommand>;

export const testCommandHandler: RouteHandler<
    TestCommand,
    TestCommandData
> = (event) => {
    return Promise.resolve(E.right({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: event.data,
    }));
};

export const commandHandlerMap: RouteHandlerMap = {
    TEST_COMMAND: {
        handler: testCommandHandler,
        inputType: TestCommand,
    },
};
