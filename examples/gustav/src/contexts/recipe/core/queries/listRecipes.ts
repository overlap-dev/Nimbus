import { Query } from '@nimbus/core';
import { type EventStore, loadAggregates } from '@nimbus/eventsourcing';
import { Recipe } from '../domain/recipe.ts';
import { recipeReducer } from '../domain/recipeAggregate.ts';

export const ListRecipesQueryType = 'at.overlap.nimbus.list-recipes' as const;

export type ListRecipesQuery = Query<{
    limit?: number;
    offset?: number;
}> & {
    type: typeof ListRecipesQueryType;
};

/**
 * List all recipes using dynamic aggregate boundaries.
 *
 * This demonstrates reading events recursively across multiple aggregates
 * and reconstructing each one's state independently.
 *
 * Instead of querying a read model, we rebuild state from events in real-time.
 * This is powerful for:
 * - Avoiding eventual consistency issues (always current)
 * - Querying across aggregate boundaries
 * - Temporal queries (add time bounds to see state at any point)
 *
 * @param query - List query with pagination
 * @param eventStore - Event store to read from
 * @returns Array of reconstructed recipes
 */
export const listRecipes = async (
    query: ListRecipesQuery,
    eventStore: EventStore,
): Promise<Recipe[]> => {
    // Load all recipe aggregates by reading events recursively
    // from the parent subject '/recipes'
    const aggregates = await loadAggregates(
        eventStore,
        '/recipes',
        null,
        recipeReducer,
        (event) => event.subject, // Group events by their subject
    );

    // Extract non-null recipe states (filter out deleted recipes)
    const recipes: Recipe[] = [];
    for (const [_subject, snapshot] of aggregates) {
        if (snapshot.state !== null) {
            recipes.push(snapshot.state);
        }
    }

    // Apply pagination (in a real app, you might do this at the event store level)
    const offset = query.data.offset ?? 0;
    const limit = query.data.limit ?? 10;

    return recipes.slice(offset, offset + limit);
};
