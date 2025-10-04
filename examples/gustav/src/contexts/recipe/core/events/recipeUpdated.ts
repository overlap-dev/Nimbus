import { type Event, getLogger } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const RecipeUpdatedEventType = 'at.overlap.nimbus.recipe-updated' as const;

export type RecipeUpdatedEvent = Event<Partial<Recipe>> & {
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

    // In event sourcing, this would update the read model
    // The event itself is already stored in the event store
    const slug = event.subject?.split('/').pop();
    if (!slug) {
        throw new Error('Recipe slug not found in event subject');
    }

    const recipe = await repository.update(slug, event.data);
    return recipe;
};
