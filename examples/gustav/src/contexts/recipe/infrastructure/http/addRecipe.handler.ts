import { RouteHandler } from '@nimbus/core';
import { eventBus } from '../../../../eventBus.ts';
import { eventSourcingDBEventStore } from '../../../../shared/adapters/eventsourcingdbEventStore.ts';
import { addRecipe, AddRecipeCommand } from '../../core/commands/addRecipe.ts';
import { Recipe } from '../../core/domain/recipe.ts';

export const addRecipeHandler: RouteHandler<
    AddRecipeCommand,
    Recipe
> = async (command) => {
    const result = await addRecipe(
        command,
        eventSourcingDBEventStore,
        eventBus,
    );

    return {
        statusCode: 200,
        data: result,
    };
};
