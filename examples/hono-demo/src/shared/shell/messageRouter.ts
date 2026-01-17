import { getLogger, MessageRouter } from '@nimbus/core';
import { registerUserMessages } from '../../iam/users/shell/messages/registerUserMessages.ts';

export const messageRouter = new MessageRouter({
    logInput: (input) => {
        getLogger().debug({
            category: 'MessageRouter',
            message: 'Received input',
            data: { input },
            ...(input?.correlationid
                ? { correlationId: input.correlationid }
                : {}),
        });
    },
    logOutput: (output) => {
        getLogger().debug({
            category: 'MessageRouter',
            message: 'Output',
            data: { output },
            ...(output?.correlationid
                ? { correlationId: output.correlationid }
                : {}),
        });
    },
});

export const initMessages = () => {
    registerUserMessages();
};
