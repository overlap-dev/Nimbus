import { AuthContext, Query } from '@nimbus/core';
import { z } from 'zod';
import type { Recipe } from '../domain/recipe.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const GetRecipeQuery = Query(
    z.literal('recipe.get'),
    z.object({
        id: z.string(),
    }),
    AuthContext,
);
export type GetRecipeQuery = z.infer<typeof GetRecipeQuery>;

export const getRecipe = async (
    query: GetRecipeQuery,
    repository: RecipeRepository,
): Promise<Recipe> => {
    return await repository.getById(query.data.payload.id);
};
