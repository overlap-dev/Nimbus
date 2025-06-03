import { z } from 'zod';
import { CloudEvent } from '../cloudEvent/index.ts';
import { MessageEnvelope } from '../messageEnvelope.ts';
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
 *
 * TODO: We should still declare the Query and Command as its own type using CloudEvent and MessageEnvelope
 */
export const TestCommand = CloudEvent(
    z.literal('test.command'),
    MessageEnvelope(TestCommandData, z.object({})),
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
