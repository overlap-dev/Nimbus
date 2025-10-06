import { type Event, getLogger } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

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

export const recipeUpdated = async (
    event: RecipeUpdatedEvent,
    repository: RecipeRepository,
) => {
    getLogger().info({
        message: 'recipeUpdated Handler',
        data: event.data,
    });

    await repository.update(event.data.slug, event.data.updates);
};
