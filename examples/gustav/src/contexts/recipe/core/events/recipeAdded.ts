import { Event } from '@nimbus/core';
import { z } from 'zod';

export const RecipeAddedEvent = Event(
    z.literal('recipe.added'),
    z.object({
        id: z.string(),
        name: z.string(),
    }),
);
export type RecipeAddedEvent = z.infer<typeof RecipeAddedEvent>;
