import { type Event, getLogger } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';

export const RecipeUpdatedEventType =
    'at.overlap.nimbus.recipe-updated' as const;

export type RecipeUpdatedEvent =
    & Event<{
        slug: string;
        updates: Partial<Recipe>;
    }>
    & {
        type: typeof RecipeUpdatedEventType;
    };

export const recipeUpdated = (
    event: RecipeUpdatedEvent,
) => {
    getLogger().info({
        message: 'recipeUpdated Handler',
        data: event.data,
    });
};
