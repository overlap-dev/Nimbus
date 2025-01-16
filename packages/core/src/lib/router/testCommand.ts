import { z } from 'zod';
import { CommandMetadata } from '../command/commandMetadata.ts';
import { Command } from '../command/index.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

export const TestCommandData = z.object({
    aNumber: z.number(),
});
export type TestCommandData = z.infer<typeof TestCommandData>;

export const TestCommand = Command(
    z.literal('TEST_COMMAND'),
    TestCommandData,
    CommandMetadata(z.record(z.string(), z.string())),
);
export type TestCommand = z.infer<typeof TestCommand>;

export const testCommandHandler: RouteHandler<
    TestCommand,
    TestCommandData
> = (event) => {
    return Promise.resolve({
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
