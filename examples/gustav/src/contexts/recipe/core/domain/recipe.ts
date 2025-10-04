import { Ingredient } from './ingredient.ts';

export type Recipe = {
    slug: string;
    name: string;
    instructions: string[];
    ingredients: Ingredient[];
    tags: string[];
};
