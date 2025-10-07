import { type Event, getLogger } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';

export const RecipeAddedCommandType = 'at.overlap.nimbus.recipe-added' as const;

export type RecipeAddedEvent = Event<Recipe> & {
    type: typeof RecipeAddedCommandType;
};

export const recipeAdded = (
    event: RecipeAddedEvent,
) => {
    getLogger().info({
        message: 'recipeAdded Handler',
        data: event.data,
    });
};
