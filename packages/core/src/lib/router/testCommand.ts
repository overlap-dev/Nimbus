import * as E from 'fp-ts/Either';
import { z } from 'zod';
import { Command } from '../command';
import { RouteHandler, RouteHandlerMap } from './router';
import { AuthPolicy } from './testAuthPolicy';

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
> = async (event) => {
    return E.right({
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        data: event.data,
    });
};

export const commandHandlerMap: RouteHandlerMap = {
    TEST_COMMAND: {
        handler: testCommandHandler,
        inputType: TestCommand,
    },
};
