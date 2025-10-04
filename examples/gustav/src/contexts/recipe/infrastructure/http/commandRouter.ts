import { getLogger, MessageRouter } from '@nimbus/core';
import { AddRecipeCommandType } from '../../core/commands/addRecipe.ts';
import { addRecipeHandler } from './handler/addRecipe.handler.ts';

export const commandRouter = new MessageRouter('command', {
    logInput: (input: any) => {
        getLogger().info({
            category: 'Nimbus',
            ...(input?.correlationid && {
                correlationId: input.correlationid,
            }),
            message:
                `${input?.correlationid} - [Command] ${input?.type} from ${input?.source}`,
        });
    },
});

commandRouter.register(
    AddRecipeCommandType,
    addRecipeHandler,
);
