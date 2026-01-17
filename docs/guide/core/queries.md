# Queries

Queries represent read operations - requests for information without changing application state.

Queries follow the Query pattern from CQRS (Command Query Responsibility Segregation), where reads are separated from writes to allow independent optimization and scaling.

::: info Example Application
The examples on this page reference the Gustav application.

You can find the full example on GitHub: [Gustav Recipe App](https://github.com/overlap-dev/Nimbus/tree/main/examples/gustav)
:::

## Key Characteristics

- **Read Operations**: Queries fetch data without modifying state
- **Idempotent**: Multiple executions return the same result (if data hasn't changed)
- **Optimized for Reading**: Can use specialized read models or databases
- **Type-Safe**: Full TypeScript type safety for query parameters and results

## Query Structure

A query in Nimbus follows the CloudEvents specification and consists of:

```typescript
export type Query<T> = {
    specversion: '1.0';
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    data: T;
    datacontenttype: string;
};
```

## Example: Get Recipe Query

### Define the Query Type

Create a query type definition in the core layer:

```typescript
// core/queries/getRecipe.ts
import { Query } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';

export const GetRecipeQueryType = 'at.overlap.nimbus.get-recipe' as const;

export type GetRecipeParams = {
    slug: string;
};

export type GetRecipeQuery = Query<GetRecipeParams> & {
    type: typeof GetRecipeQueryType;
};
```

### Implement Core Logic with Port

The core defines the query logic and uses a port (interface) for data access:

```typescript
// core/queries/getRecipe.ts
import { RecipeRepository } from '../ports/recipeRepository.ts';

export const getRecipe = async (
    query: GetRecipeQuery,
    repository: RecipeRepository,
): Promise<Recipe> => {
    return await repository.getBySlug(query.data.slug);
};
```

### Define the Port

The port is an interface that defines the contract for data access:

```typescript
// core/ports/recipeRepository.ts
export interface RecipeRepository {
    getBySlug(slug: string): Promise<Recipe | null>;
    list(): Promise<Recipe[]>;
}
```

### Implement Shell Handler

The handler provides the repository implementation and calls the core:

```typescript
// infrastructure/http/handler/getRecipe.handler.ts
import { MessageHandler } from '@nimbus/core';
import { Recipe } from '../../../core/domain/recipe.ts';
import { getRecipe, GetRecipeQuery } from '../../../core/queries/getRecipe.ts';
import { recipeMemoryRepository } from '../../repository/recipeMemoryRepository.ts';

export const getRecipeHandler: MessageHandler<GetRecipeQuery, Recipe> =
    async (query) => {
        const recipe = await getRecipe(query, recipeMemoryRepository);
        return recipe;
    };
```

### Implement the Adapter

The adapter provides the actual implementation of the repository port:

```typescript
// infrastructure/repository/recipeMemoryRepository.ts
import { NotFoundException } from '@nimbus/core';
import { Recipe } from '../../core/domain/recipe.ts';
import { RecipeRepository } from '../../core/ports/recipeRepository.ts';

const recipes = new Map<string, Recipe>();

export const recipeMemoryRepository: RecipeRepository = {
    async getBySlug(slug: string): Promise<Recipe> {
        const recipe = recipes.get(slug);
        if (!recipe) {
            throw new NotFoundException('Recipe not found', {
                errorCode: 'RECIPE_NOT_FOUND',
            });
        }
        return recipe;
    },

    async list(): Promise<Recipe[]> {
        return Array.from(recipes.values());
    },
};
```

## Architecture Pattern

Queries follow the Pure Core - Imperative Shell pattern with ports and adapters:

1. **Core Layer**:
   - Define query types
   - Define ports (interfaces) for data access
   - Implement query logic that uses ports
   - Apply business rules for data filtering/transformation

2. **Infrastructure Layer** (Shell):
   - Implement adapters that fulfill port contracts
   - Define message handlers
   - Connect handlers to adapters
   - Handle errors and responses

## Read Models

In CQRS systems, queries often read from optimized read models rather than the event store:

```typescript
// infrastructure/readModel/recipeReadModel.ts
import { MongoCollection } from '@nimbus/mongodb';
import { Recipe } from '../../core/domain/recipe.ts';

export const recipeReadModel = new MongoCollection<Recipe>('recipes');

// Update read model when events occur
export const updateRecipeReadModel = async (event: RecipeAddedEvent) => {
    await recipeReadModel.insertOne(event.data);
};
```

The read model is kept in sync by subscribing to domain events:

```typescript
// Event handler updates the read model
eventStore.observe({
    subjects: ['/recipes/*'],
    handler: async (event) => {
        switch (event.type) {
            case 'at.overlap.nimbus.recipe-added':
                await recipeReadModel.insertOne(event.data);
                break;
            case 'at.overlap.nimbus.recipe-updated':
                await recipeReadModel.updateOne(
                    { slug: event.data.slug },
                    event.data,
                );
                break;
            case 'at.overlap.nimbus.recipe-deleted':
                await recipeReadModel.deleteOne({ slug: event.data.slug });
                break;
        }
    },
});
```

## Best Practices

### Keep Queries Simple

Queries should focus on data retrieval with minimal business logic:

```typescript
// ✅ Good - Simple data retrieval
export const getRecipe = async (
    query: GetRecipeQuery,
    repository: RecipeRepository,
): Promise<Recipe> => {
    return await repository.getBySlug(query.data.slug);
};

// ⚠️ Consider - Business logic might belong in query
export const getRecipe = async (
    query: GetRecipeQuery,
    repository: RecipeRepository,
    authContext: AuthContext,
): Promise<Recipe> => {
    const recipe = await repository.getBySlug(query.data.slug);

    // Filter sensitive data based on permissions
    if (!authContext.hasRole('admin')) {
        delete recipe.internalNotes;
    }

    return recipe;
};
```

### Use Pagination for Lists

Always paginate list queries to prevent performance issues:

```typescript
export type ListRecipesParams = {
    page?: number;
    pageSize?: number;
    category?: string;
};

export type ListRecipesQuery = Query<ListRecipesParams> & {
    type: typeof ListRecipesQueryType;
};

export const listRecipes = async (
    query: ListRecipesQuery,
    repository: RecipeRepository,
): Promise<{ recipes: Recipe[]; total: number }> => {
    const { page = 1, pageSize = 20, category } = query.data;
    return await repository.list({ page, pageSize, category });
};
```

### Optimize Read Models

Read models should be denormalized and optimized for specific query patterns:

```typescript
// Denormalized read model for recipe list view
export type RecipeListItem = {
    slug: string;
    title: string;
    category: string;
    cookingTime: number;
    difficulty: string;
    thumbnailUrl: string;
    // No full ingredient list or instructions
};

// Separate detailed read model for single recipe view
export type RecipeDetail = Recipe & {
    relatedRecipes: string[];
    authorInfo: AuthorInfo;
};
```

### Cache Frequently Accessed Data

Consider caching for queries that are called frequently:

```typescript
const recipeCache = new Map<string, Recipe>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getRecipe = async (
    query: GetRecipeQuery,
    repository: RecipeRepository,
): Promise<Recipe> => {
    const cached = recipeCache.get(query.data.slug);
    if (cached) return cached;

    const recipe = await repository.getBySlug(query.data.slug);
    recipeCache.set(query.data.slug, recipe);

    setTimeout(() => recipeCache.delete(query.data.slug), CACHE_TTL);

    return recipe;
};
```

## Routing Queries

Queries are routed to handlers using the message router. See the [HTTP Guide](/guide/http/) for more details on routing queries through HTTP endpoints.

## Related Patterns

- [Commands](/guide/core/commands) - Write operations
- [Events](/guide/core/events) - Domain events
- [Event Sourcing](/guide/eventsourcing/) - Event-based state management
- [CQRS](/guide/what-is-nimbus#cqrs-event-sourcing) - Separating reads and writes
