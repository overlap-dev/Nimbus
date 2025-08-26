import { RouteHandler } from '@nimbus/core';
import { Recipe } from '../../core/domain/recipe.ts';
import { getRecipe, GetRecipeQuery } from '../../core/queries/getRecipe.ts';
import { recipeMemoryRepository } from '../repository/recipeMemoryRepository.ts';

export const getRecipeHandler: RouteHandler<
    GetRecipeQuery,
    Recipe
> = async (query) => {
    const recipe = await getRecipe(query, recipeMemoryRepository);

    return {
        statusCode: 200,
        data: recipe,
    };
};
