import { getLogger, MessageRouter } from '@nimbus/core';
import { AddRecipeCommandType } from '../../core/commands/addRecipe.ts';
import { DeleteRecipeCommandType } from '../../core/commands/deleteRecipe.ts';
import { UpdateRecipeCommandType } from '../../core/commands/updateRecipe.ts';
import { addRecipeHandler } from './handler/addRecipe.handler.ts';
import { deleteRecipeHandler } from './handler/deleteRecipe.handler.ts';
import { updateRecipeHandler } from './handler/updateRecipe.handler.ts';

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

commandRouter.register(
    UpdateRecipeCommandType,
    updateRecipeHandler,
);

commandRouter.register(
    DeleteRecipeCommandType,
    deleteRecipeHandler,
);
