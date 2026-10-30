import { getRouter, type MessageRouter, setupRouter } from '@nimbus-cqrs/core';
import { createRouterLoggingOptions } from '../logger.ts';
import { registerIamCommands } from './iam/command.router.ts';
import { registerTicketingCommands } from './ticketing/command.router.ts';

const COMMAND_ROUTER_NAME = 'commandRouter';

export const initCommandRouter = (): void => {
    setupRouter(
        COMMAND_ROUTER_NAME,
        createRouterLoggingOptions(COMMAND_ROUTER_NAME),
    );

    // Register commands from the different domains.
    registerIamCommands();
    registerTicketingCommands();
};

export const getCommandRouter = (): MessageRouter => {
    return getRouter(COMMAND_ROUTER_NAME);
};
