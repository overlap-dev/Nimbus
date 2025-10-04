import { getLogger, MessageRouter } from '@nimbus/core';
import { AddRecipeCommandType } from '../../contexts/recipe/core/commands/addRecipe.ts';
import { addRecipeHandler } from '../../contexts/recipe/infrastructure/router/addRecipe.handler.ts';

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
    { allowUnsafeInput: true },
);
