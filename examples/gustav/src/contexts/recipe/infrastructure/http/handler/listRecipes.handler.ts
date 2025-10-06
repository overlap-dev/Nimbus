import { MessageHandler } from '@nimbus/core';
import { Recipe } from '../../../core/domain/recipe.ts';
import {
    listRecipes,
    ListRecipesQuery,
} from '../../../core/queries/listRecipes.ts';
import { recipeMemoryRepository } from '../../repository/recipeMemoryRepository.ts';

export const listRecipesHandler: MessageHandler<
    ListRecipesQuery,
    Recipe[]
> = async (query) => {
    const recipes = await listRecipes(query, recipeMemoryRepository);

    return recipes;
};
