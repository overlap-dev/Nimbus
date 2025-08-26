import { RouteHandler } from '@nimbus/core';
import { eventBus } from '../../../../eventBus.ts';
import { addRecipe, AddRecipeCommand } from '../../core/commands/addRecipe.ts';
import { Recipe } from '../../core/domain/recipe.ts';
import { recipeMemoryRepository } from '../repository/recipeMemoryRepository.ts';

export const addRecipeHandler: RouteHandler<
    AddRecipeCommand,
    Recipe
> = async (command) => {
    const result = await addRecipe(command, recipeMemoryRepository, eventBus);

    return {
        statusCode: 200,
        data: result,
    };
};
