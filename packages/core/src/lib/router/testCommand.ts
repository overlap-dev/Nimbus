import type { Command } from '../message/command.ts';
import type { RouteHandler, RouteHandlerMap } from './router.ts';

/**
 * The type for the testCommand data
 */
export type TestCommandData = {
    aNumber: number;
};

/**
 * A test command
 */
export const testCommand: Command<TestCommandData> = {
    specversion: '1.0',
    id: '123',
    correlationid: '456',
    time: '2025-01-01T00:00:00Z',
    source: 'https://nimbus.overlap.at',
    type: 'at.overlap.nimbus.test-command',
    data: {
        aNumber: 42,
    },
    datacontenttype: 'application/json',
};

/**
 * The handler for the TestCommand.
 */
export const testCommandHandler: RouteHandler<
    Command<TestCommandData>,
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
export const commandHandlerMap: RouteHandlerMap<Command<any>> = {
    'at.overlap.nimbus.test-command': {
        handler: testCommandHandler,
        allowUnsafeInput: true,
    },
};
