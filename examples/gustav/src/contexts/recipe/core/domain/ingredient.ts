import { Unit } from '../../../../shared/types/unit.ts';

export type Ingredient = {
    name: string;
    quantity: number;
    unit: Unit;
    productId?: string;
};
