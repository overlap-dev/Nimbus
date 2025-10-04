import { Unit } from '../../../../shared/types/unit.ts';

export type Ingredient = {
    name: string;
    amount: number;
    unit: Unit;
    productId?: string;
};
