import { Query } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const ListRecipesQueryType = 'at.overlap.nimbus.list-recipes' as const;

export type ListRecipesQuery =
    & Query<{
        limit?: number;
        offset?: number;
    }>
    & {
        type: typeof ListRecipesQueryType;
    };

export const listRecipes = async (
    query: ListRecipesQuery,
    repository: RecipeRepository,
): Promise<Recipe[]> => {
    const recipes = await repository.list({
        limit: query.data.limit,
        offset: query.data.offset,
    });

    return recipes;
};
