import { Query } from '@nimbus/core';
import type { Recipe } from '../domain/recipe.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const GetRecipeQueryType = 'at.overlap.nimbus.get-recipe' as const;

export type GetRecipeParams = {
    slug: string;
};

export type GetRecipeQuery = Query<GetRecipeParams> & {
    type: typeof GetRecipeQueryType;
};

export const getRecipe = async (
    query: GetRecipeQuery,
    repository: RecipeRepository,
): Promise<Recipe> => {
    return await repository.getBySlug(query.data.slug);
};
