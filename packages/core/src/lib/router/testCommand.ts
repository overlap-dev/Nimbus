import { z } from 'zod';
import { Command } from '../command/command.ts';
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
    z.literal('test.command'),
    TestCommandData,
    z.object({}),
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
        data: event.data.payload,
    });
};

/**
 * The handler map for the TestCommand.
 */
export const commandHandlerMap: RouteHandlerMap = {
    'test.command': {
        handler: testCommandHandler,
        inputType: TestCommand,
    },
};
