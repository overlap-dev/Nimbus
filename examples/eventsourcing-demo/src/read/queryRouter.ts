import { getLogger, setupRouter } from '@nimbus-cqrs/core';
import { registerUserQueries } from './iam/users/queries/registerUserQueries.ts';

export const initQueryRouter = () => {
    setupRouter('queryRouter', {
        logInput: (input) => {
            getLogger().debug({
                category: 'QueryRouter',
                message: 'Received input',
                data: { input },
                ...(input?.correlationid
                    ? { correlationId: input.correlationid }
                    : {}),
            });
        },
        logOutput: (output) => {
            getLogger().debug({
                category: 'QueryRouter',
                message: 'Output',
                data: { output },
                ...(output?.correlationid
                    ? { correlationId: output.correlationid }
                    : {}),
            });
        },
    });

    // Register queries from the different domains.
    registerUserQueries();
};
