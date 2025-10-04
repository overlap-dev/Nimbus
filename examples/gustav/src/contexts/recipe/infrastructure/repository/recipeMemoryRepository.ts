import { NotFoundException } from '@nimbus/core';
import { ulid } from '@std/ulid';
import type { Recipe } from '../../core/domain/recipe.ts';
import { RecipeRepository } from '../../core/ports/recipeRepository.ts';

const makeMemoryRepository = (): RecipeRepository => {
    const store = new Map<string, Recipe>();

    return {
        generateId: () => {
            return ulid();
        },

        // deno-lint-ignore require-await
        insert: async (recipe) => {
            store.set(recipe.slug, recipe);
            return recipe;
        },

        // deno-lint-ignore require-await
        update: async (recipe) => {
            const existingRecipe = store.get(recipe.slug);

            if (!existingRecipe) {
                throw new NotFoundException('Recipe not found', {
                    errorCode: 'RECIPE_NOT_FOUND',
                });
            }

            store.set(recipe.slug, recipe);
            return recipe;
        },

        // deno-lint-ignore require-await
        delete: async (slug) => {
            const recipe = store.get(slug);

            if (!recipe) {
                throw new NotFoundException('Recipe not found', {
                    errorCode: 'RECIPE_NOT_FOUND',
                });
            }

            store.delete(slug);
        },

        // deno-lint-ignore require-await
        getBySlug: async (slug) => {
            const recipe = store.get(slug);

            if (!recipe) {
                throw new NotFoundException('Recipe not found', {
                    errorCode: 'RECIPE_NOT_FOUND',
                });
            }

            return recipe;
        },

        // deno-lint-ignore require-await
        list: async (options) => {
            const limit = options?.limit ?? 10;
            const offset = options?.offset ?? 0;
            const filter = options?.filter ?? {};

            return Array.from(store.values())
                .filter((recipe) => {
                    return Object.entries(filter).every(([key, value]) => {
                        return recipe[key as keyof Recipe] === value;
                    });
                })
                .slice(offset, offset + limit);
        },

        // deno-lint-ignore require-await
        count: async (options) => {
            const filter = options?.filter ?? {};

            return Array.from(store.values())
                .filter((recipe) => {
                    return Object.entries(filter).every(([key, value]) => {
                        return recipe[key as keyof Recipe] === value;
                    });
                })
                .length;
        },
    };
};

export const recipeMemoryRepository = makeMemoryRepository();
