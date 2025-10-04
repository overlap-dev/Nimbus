import { RouteHandler } from '@nimbus/core';
import { eventSourcingDBEventStore } from '../../../../shared/adapters/eventSourcingDBEventStore.ts';
import { addRecipe, AddRecipeCommand } from '../../core/commands/addRecipe.ts';
import { Recipe } from '../../core/domain/recipe.ts';

export const addRecipeHandler: RouteHandler<
    AddRecipeCommand,
    Recipe
> = async (command) => {
    const result = await addRecipe(
        command,
        eventSourcingDBEventStore,
    );

    return {
        statusCode: 200,
        data: result,
    };
};
