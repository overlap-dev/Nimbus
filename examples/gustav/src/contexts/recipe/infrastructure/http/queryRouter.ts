import { getLogger, MessageRouter } from '@nimbus/core';
import { GetRecipeQueryType } from '../../core/queries/getRecipe.ts';
import { ListRecipesQueryType } from '../../core/queries/listRecipes.ts';
import { getRecipeHandler } from './handler/getRecipe.handler.ts';
import { listRecipesHandler } from './handler/listRecipes.handler.ts';

export const queryRouter = new MessageRouter('query', {
    logInput: (input: any) => {
        getLogger().info({
            category: 'Nimbus',
            ...(input?.correlationid && {
                correlationId: input.correlationid,
            }),
            message:
                `${input?.correlationid} - [Query] ${input?.type} from ${input?.source}`,
        });
    },
});

queryRouter.register(
    GetRecipeQueryType,
    getRecipeHandler,
);

queryRouter.register(
    ListRecipesQueryType,
    listRecipesHandler,
);
