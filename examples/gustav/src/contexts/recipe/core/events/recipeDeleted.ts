import { type Event, getLogger } from '@nimbus/core';
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const RecipeDeletedEventType =
    'at.overlap.nimbus.recipe-deleted' as const;

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

    await repository.delete(event.data.slug);
};
