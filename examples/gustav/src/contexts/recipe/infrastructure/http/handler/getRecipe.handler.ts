import { MessageHandler } from '@nimbus/core';
import { Recipe } from '../../../core/domain/recipe.ts';
import { getRecipe, GetRecipeQuery } from '../../../core/queries/getRecipe.ts';
import { recipeMemoryRepository } from '../../repository/recipeMemoryRepository.ts';

export const getRecipeHandler: MessageHandler<
    GetRecipeQuery,
    Recipe
> = async (query) => {
    return getRecipe(query, recipeMemoryRepository);
};
