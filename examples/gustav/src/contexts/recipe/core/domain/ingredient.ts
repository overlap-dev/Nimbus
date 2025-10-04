import { Unit } from '../../../../shared/core/domain/unit.ts';

export type Ingredient = {
    name: string;
    amount: number;
    unit: Unit;
    productId?: string;
};
