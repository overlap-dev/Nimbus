import { z } from 'zod';
import { Unit } from '../../../../shared/types/unit.ts';

export const Ingredient = z.object({
    name: z.string(),
    quantity: z.number(),
    unit: Unit,
});
export type Ingredient = z.infer<typeof Ingredient>;
