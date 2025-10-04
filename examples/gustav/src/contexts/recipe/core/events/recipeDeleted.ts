import { type Event, getLogger } from '@nimbus/core';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const RecipeDeletedEventType = 'at.overlap.nimbus.recipe-deleted' as const;

export type RecipeDeletedEvent = Event<{ slug: string }> & {
    type: typeof RecipeDeletedEventType;
};

export const recipeDeleted = async (
    event: RecipeDeletedEvent,
    repository: RecipeRepository,
) => {
    getLogger().info({
        message: 'recipeDeleted Handler',
        data: event.data,
    });

    // In event sourcing, this would update the read model
    // The event itself is already stored in the event store
    const slug = event.subject?.split('/').pop();
    if (!slug) {
        throw new Error('Recipe slug not found in event subject');
    }

    await repository.delete(slug);
};
