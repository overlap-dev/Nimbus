import { z } from 'zod';
import { CommandMetadata } from '../command/commandMetadata.ts';
import { Command } from '../command/index.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * Zod schema for the TestCommandData.
 */
export const TestCommandData = z.object({
    aNumber: z.number(),
});

/**
 * The type of the TestCommandData.
 */
export type TestCommandData = z.infer<typeof TestCommandData>;

/**
 * Zod schema for the TestCommand.
 */
export const TestCommand = Command(
    z.literal('TEST_COMMAND'),
    TestCommandData,
    CommandMetadata(z.record(z.string(), z.string())),
);

/**
 * The type of the TestCommand.
 */
export type TestCommand = z.infer<typeof TestCommand>;

/**
 * The handler for the TestCommand.
 */
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

/**
 * The handler map for the TestCommand.
 */
export const commandHandlerMap: RouteHandlerMap = {
    TEST_COMMAND: {
        handler: testCommandHandler,
        inputType: TestCommand,
    },
};
