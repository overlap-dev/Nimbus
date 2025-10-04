import { type Event, getLogger } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const RecipeAddedCommandType = 'at.overlap.nimbus.recipe-added' as const;

export type RecipeAddedEvent = Event<Recipe> & {
    type: typeof RecipeAddedCommandType;
};

export const recipeAdded = async (
    event: RecipeAddedEvent,
    repository: RecipeRepository,
) => {
    getLogger().info({
        message: 'recipeAdded Handler',
        data: event.data,
    });

    const recipe = await repository.insert(event.data);

    return recipe;
};
