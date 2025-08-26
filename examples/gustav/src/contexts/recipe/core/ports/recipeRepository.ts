import type { Recipe } from '../domain/recipe.ts';

export interface RecipeRepository {
    generateId: () => string;

    insert: (recipe: Recipe) => Promise<Recipe>;

    update: (recipe: Recipe) => Promise<Recipe>;

    delete: (id: string) => Promise<void>;

    getBySlug: (id: string) => Promise<Recipe>;

    list: (
        options?: {
            limit?: number;
            offset?: number;
            filter?: Partial<Recipe>;
        },
    ) => Promise<Recipe[]>;

    count: (
        options?: {
            filter?: Partial<Recipe>;
        },
    ) => Promise<number>;
}
