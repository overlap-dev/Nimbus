import { Event, getLogger } from '@nimbus/core';
import { z } from 'zod';
import { RecipeSlug } from '../domain/recipe.ts';

export const RecipeAddedEvent = Event(
    z.literal('recipe.added'),
    z.object({
        slug: RecipeSlug,
        name: z.string(),
    }),
);
export type RecipeAddedEvent = z.infer<typeof RecipeAddedEvent>;

export const recipeAdded = (
    event: RecipeAddedEvent,
) => {
    getLogger().info({
        message: 'recipeAdded Handler',
        data: event,
    });
};
