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

        insert: async (recipe) => {
            store.set(recipe.slug, recipe);
            return recipe;
        },

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

        delete: async (slug) => {
            const recipe = store.get(slug);

            if (!recipe) {
                throw new NotFoundException('Recipe not found', {
                    errorCode: 'RECIPE_NOT_FOUND',
                });
            }

            store.delete(slug);
        },

        getBySlug: async (slug) => {
            const recipe = store.get(slug);

            if (!recipe) {
                throw new NotFoundException('Recipe not found', {
                    errorCode: 'RECIPE_NOT_FOUND',
                });
            }

            return recipe;
        },

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
