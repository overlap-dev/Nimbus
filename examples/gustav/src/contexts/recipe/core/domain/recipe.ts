import { z } from 'zod';
import { Ingredient } from './ingredient.ts';

export const RecipeSlug = z.string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, {
        message:
            'Slug must contain only lowercase letters, numbers, and hyphens',
    });
export type RecipeSlug = z.infer<typeof RecipeSlug>;

export const Recipe = z.object({
    slug: RecipeSlug,
    name: z.string(),
    instructions: z.array(z.string()),
    ingredients: z.array(Ingredient),
});
export type Recipe = z.infer<typeof Recipe>;
