import { z } from 'zod';
import { Ingredient } from './ingredient.ts';

export const Recipe = z.object({
    id: z.string(),
    name: z.string(),
    instructions: z.array(z.string()),
    ingredients: z.array(Ingredient),
});
export type Recipe = z.infer<typeof Recipe>;
