# Commands

Commands represent write operations - intentions to change system state in the application.

Commands follow the Command pattern from CQRS (Command Query Responsibility Segregation), where writes and reads are separated for better scalability and maintainability.

::: info Example Application
The examples on this page reference the Gustav application.

You can find the full example on GitHub: [Gustav Recipe App](https://github.com/overlap-dev/Nimbus/tree/main/examples/gustav)
:::

## Key Characteristics

- **Write Operations**: Commands modify application state
- **Intent-Based**: Commands express what should happen (e.g., "AddRecipe", "DeleteRecipe")
- **Validated**: Command data is validated before execution
- **Type-Safe**: Full TypeScript type safety for command data and handlers

## Command Structure

A command in Nimbus follows the CloudEvents specification and consists of:

```typescript
export type Command<T> = {
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

## Example: Add Recipe Command

### Define the Command Type

Create a command type definition in the core layer:

```typescript
// core/commands/addRecipe.ts
import { Command } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';

export const AddRecipeCommandType = 'at.overlap.nimbus.app-recipe' as const;

export type AddRecipeCommand = Command<Recipe> & {
    type: typeof AddRecipeCommandType;
};
```

### Implement Pure Core Logic

The core function contains pure business logic with no I/O operations:

```typescript
// core/commands/addRecipe.ts
export const addRecipe = (
    command: AddRecipeCommand,
    state: RecipeState,
): {
    newState: Recipe;
    events: RecipeAddedEvent[];
} => {
    // Business validation
    if (state !== null) {
        throw new InvalidInputException('Recipe already exists', {
            errorCode: 'DUPLICATE_RECIPE',
        });
    }

    const subject = recipeSubject(command.data.slug);
    const event = createRecipeAddedEvent(command, subject);

    return {
        newState: command.data,
        events: [event],
    };
};
```

### Implement Shell Handler

The handler orchestrates I/O operations and calls the pure core logic:

```typescript
// infrastructure/http/handler/addRecipe.handler.ts
import { MessageHandler } from '@nimbus/core';
import { loadAggregate } from '@nimbus/eventsourcing';
import { eventStore } from '../eventStore.ts';
import { addRecipe, AddRecipeCommand } from '../../../core/commands/addRecipe.ts';
import { recipeReducer, recipeSubject } from '../../../core/domain/recipeAggregate.ts';

export const addRecipeHandler: MessageHandler<AddRecipeCommand, Recipe> =
    async (command) => {
        const subject = recipeSubject(command.data.slug);

        // Load current state from event store
        const snapshot = await loadAggregate(
            eventStore,
            subject,
            null,
            recipeReducer,
        );

        // Call pure core logic
        const { newState, events } = addRecipe(command, snapshot.state);

        // Persist events with optimistic concurrency control
        await eventStore.writeEvents(events, {
            preconditions: snapshot.lastEventId !== undefined
                ? [{ type: 'isSubjectOnEventId', payload: { subject, eventId: snapshot.lastEventId } }]
                : [{ type: 'isSubjectPristine', payload: { subject } }],
        });

        return newState;
    };
```

## Architecture Pattern

Commands follow the Pure Core - Imperative Shell pattern:

1. **Core Layer** (Pure):
   - Define command types
   - Implement business logic
   - No I/O operations
   - Returns new state and events to persist

2. **Infrastructure Layer** (Shell):
   - Define message handlers
   - Load current state from data sources
   - Call pure core functions
   - Persist results
   - Handle errors and responses

## Best Practices

### Keep Core Pure

The core command logic should be completely free of side effects:

```typescript
// ✅ Good - Pure function
export const addRecipe = (command: AddRecipeCommand, state: RecipeState) => {
    if (state !== null) throw new InvalidInputException('Recipe already exists');
    return { newState: command.data, events: [createEvent(command)] };
};

// ❌ Bad - Has side effects
export const addRecipe = async (command: AddRecipeCommand) => {
    const existing = await db.findRecipe(command.data.slug); // I/O in core!
    if (existing) throw new InvalidInputException('Recipe already exists');
    await db.saveRecipe(command.data); // I/O in core!
};
```

### Use Ports for Dependencies

When the core needs external data, define ports (interfaces):

```typescript
// core/ports/recipeRepository.ts
export interface RecipeRepository {
    getBySlug(slug: string): Promise<Recipe | null>;
    save(recipe: Recipe): Promise<void>;
}
```

The shell provides the implementation (adapter):

```typescript
// infrastructure/repository/recipeMemoryRepository.ts
export const recipeMemoryRepository: RecipeRepository = {
    async getBySlug(slug: string) { /* implementation */ },
    async save(recipe: Recipe) { /* implementation */ },
};
```

### Validate Early

Validate command data before reaching core logic using JSON schemas:

```typescript
// infrastructure/http/schemas/addRecipeCommandSchema.ts
export const addRecipeCommandSchema = {
    $id: 'https://nimbus.overlap.at/schemas/commands/add-recipe/v1',
    type: 'object',
    properties: {
        slug: { type: 'string', minLength: 1, maxLength: 100 },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        ingredients: { type: 'array', items: { $ref: '#/definitions/ingredient' } },
    },
    required: ['slug', 'title', 'ingredients'],
};
```

### Emit Events

Commands should emit domain events for other parts of the system to react to:

```typescript
const event: RecipeAddedEvent = {
    specversion: '1.0',
    id: ulid(),
    correlationid: command.correlationid,
    time: new Date().toISOString(),
    source: EVENT_SOURCE,
    type: 'at.overlap.nimbus.recipe-added',
    subject: `/recipes/${command.data.slug}`,
    data: command.data,
    datacontenttype: 'application/json',
};
```

## Routing Commands

Commands are routed to handlers using the message router. See the [HTTP Guide](/guide/http/) for more details on routing commands through HTTP endpoints.

## Related Patterns

- [Queries](/guide/core/queries) - Read operations
- [Events](/guide/core/events) - Domain events
- [Event Sourcing](/guide/eventsourcing/) - Persisting state as events
- [CQRS](/guide/what-is-nimbus#cqrs-event-sourcing) - Separating reads and writes
