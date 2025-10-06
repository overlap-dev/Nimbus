import { Event, NotFoundException } from '@nimbus/core';
import { type EventReducer } from '@nimbus/eventsourcing';
import { Recipe } from './recipe.ts';

/**
 * Recipe aggregate state.
 *
 * Null represents a recipe that doesn't exist or has been deleted.
 */
export type RecipeState = Recipe | null;

/**
 * Recipe event reducer.
 *
 * Applies events to recipe state to reconstruct the aggregate.
 * This is the core of event sourcing - replaying events to rebuild state.
 *
 * @param state - Current recipe state
 * @param event - Event to apply
 * @returns New recipe state after applying the event
 *
 * @example
 * ```ts
 * const events = await eventStore.readEvents('/recipes/carbonara');
 * const currentState = events.reduce(recipeReducer, null);
 * ```
 */
export const recipeReducer: EventReducer<RecipeState> = (
    state: RecipeState,
    event: Event,
): RecipeState => {
    switch (event.type) {
        case 'at.overlap.nimbus.recipe-added': {
            // Create new recipe from event data
            return event.data as Recipe;
        }

        case 'at.overlap.nimbus.recipe-updated': {
            if (!state) {
                // Cannot update a recipe that doesn't exist
                // In a real system, you might want to log this as a warning
                return state;
            }

            // Merge update data into existing recipe
            return {
                ...state,
                ...(event.data as Partial<Recipe>),
            };
        }

        case 'at.overlap.nimbus.recipe-deleted': {
            // Mark recipe as deleted
            return null;
        }

        default:
            // Unknown event type - return state unchanged
            return state;
    }
};

/**
 * Helper to get subject for a recipe.
 *
 * @param slug - Recipe slug
 * @returns Subject path for the recipe
 */
export function recipeSubject(slug: string): string {
    return `/recipes/${slug}`;
}

/**
 * Helper to validate recipe state.
 *
 * @param state - Recipe state to validate
 * @throws Error if recipe doesn't exist
 * @returns The recipe (for chaining)
 */
export function requireRecipe(state: RecipeState): Recipe {
    if (!state) {
        throw new NotFoundException('Recipe not found', {
            errorCode: 'RECIPE_NOT_FOUND',
            reason: 'The recipe with the provided slug was not found',
        });
    }
    return state;
}
