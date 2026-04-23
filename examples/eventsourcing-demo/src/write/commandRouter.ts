import { getLogger, setupRouter } from '@nimbus-cqrs/core';
import { registerUserCommands } from './iam/users/shell/commands/registerUserCommands.ts';

export const initCommandRouter = () => {
    setupRouter('commandRouter', {
        logInput: (input) => {
            getLogger().debug({
                category: 'CommandRouter',
                message: 'Received input',
                data: { input },
                ...(input?.correlationid
                    ? { correlationId: input.correlationid }
                    : {}),
            });
        },
        logOutput: (output) => {
            getLogger().debug({
                category: 'CommandRouter',
                message: 'Output',
                data: { output },
                ...(output?.correlationid
                    ? { correlationId: output.correlationid }
                    : {}),
            });
        },
    });

    // Register commands from the different domains.
    registerUserCommands();
};
