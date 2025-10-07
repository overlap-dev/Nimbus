import { type Event, getLogger } from '@nimbus/core';

export const RecipeDeletedEventType =
    'at.overlap.nimbus.recipe-deleted' as const;

export type RecipeDeletedEvent = Event<{ slug: string }> & {
    type: typeof RecipeDeletedEventType;
};

export const recipeDeleted = (
    event: RecipeDeletedEvent,
) => {
    getLogger().info({
        message: 'recipeDeleted Handler',
        data: event.data,
    });
};
