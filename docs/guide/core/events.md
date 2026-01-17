# Events

Events represent facts - things that have already happened in the system.

Events are immutable records of state changes that occurred in the application. They enable event-driven architectures, event sourcing, and asynchronous processing.

::: info Example Application
The examples on this page reference the Gustav application.

You can find the full example on GitHub: [Gustav Recipe App](https://github.com/overlap-dev/Nimbus/tree/main/examples/gustav)
:::

## Key Characteristics

- **Immutable Facts**: Events represent things that already happened and cannot be changed
- **Past Tense**: Event names use past tense (e.g., "RecipeAdded", not "AddRecipe")
- **Observable**: Other parts of the system can subscribe and react to events
- **Type-Safe**: Full TypeScript type safety for event data and handlers

## Event Structure

An event in Nimbus follows the CloudEvents specification and consists of:

```typescript
export type Event<T> = {
    specversion: '1.0';
    id: string;
    correlationid: string;
    time: string;
    source: string;
    type: string;
    subject: string;
    data: T;
    datacontenttype: string;
};
```

## Example: Recipe Added Event

### Define the Event Type

Create an event type definition in the core layer:

```typescript
// core/events/recipeAdded.ts
import { Event } from '@nimbus/core';
import { Recipe } from '../domain/recipe.ts';

export const RecipeAddedEventType = 'at.overlap.nimbus.recipe-added' as const;

export type RecipeAddedEvent = Event<Recipe> & {
    type: typeof RecipeAddedEventType;
};
```

### Create Events in Command Handlers

Events are typically created and emitted by command handlers:

```typescript
// core/commands/addRecipe.ts
import { ulid } from '@std/ulid';
import { getEnv } from '@nimbus/utils';

export const addRecipe = (
    command: AddRecipeCommand,
    state: RecipeState,
): {
    newState: Recipe;
    events: RecipeAddedEvent[];
} => {
    if (state !== null) {
        throw new InvalidInputException('Recipe already exists');
    }

    const { EVENT_SOURCE } = getEnv({ variables: ['EVENT_SOURCE'] });
    const subject = recipeSubject(command.data.slug);

    // Create the event
    const recipeAddedEvent: RecipeAddedEvent = {
        specversion: '1.0',
        id: ulid(),
        correlationid: command.correlationid,
        time: new Date().toISOString(),
        source: EVENT_SOURCE,
        type: RecipeAddedEventType,
        subject,
        data: command.data,
        datacontenttype: 'application/json',
    };

    return {
        newState: command.data,
        events: [recipeAddedEvent],
    };
};
```

### Subscribe to Events

Event handlers react to events by updating read models, sending notifications, or triggering other processes:

```typescript
// infrastructure/eventHandler/recipeAdded.handler.ts
import { getLogger } from '@nimbus/core';
import { RecipeAddedEvent } from '../../core/events/recipeAdded.ts';

export const recipeAdded = (event: RecipeAddedEvent) => {
    getLogger().info({
        message: 'Recipe added',
        slug: event.data.slug,
        title: event.data.title,
    });

    // Additional side effects:
    // - Update read model
    // - Send notification
    // - Trigger related processes
};
```

### Observe Events from Event Store

Use the event store observer to subscribe to events:

```typescript
// shared/infrastructure/eventStore.ts
import { EventStore } from '@nimbus/eventsourcingdb';
import { recipeAdded } from './eventHandler/recipeAdded.handler.ts';

export const eventStore = new EventStore(/* config */);

// Subscribe to recipe events
eventStore.observe({
    subjects: ['/recipes/*'],
    handler: async (event) => {
        switch (event.type) {
            case 'at.overlap.nimbus.recipe-added':
                recipeAdded(event as RecipeAddedEvent);
                break;
            case 'at.overlap.nimbus.recipe-updated':
                recipeUpdated(event as RecipeUpdatedEvent);
                break;
            case 'at.overlap.nimbus.recipe-deleted':
                recipeDeleted(event as RecipeDeletedEvent);
                break;
        }
    },
});
```

## Event Sourcing

Events can be used as the source of truth for application state through event sourcing:

### Event Reducer

An event reducer reconstructs aggregate state by replaying events:

```typescript
// core/domain/recipeAggregate.ts
import { Event } from '@nimbus/core';
import { EventReducer } from '@nimbus/eventsourcing';
import { Recipe } from './recipe.ts';

export type RecipeState = Recipe | null;

export const recipeReducer: EventReducer<RecipeState> = (
    state: RecipeState,
    event: Event,
): RecipeState => {
    switch (event.type) {
        case 'at.overlap.nimbus.recipe-added':
            return event.data as Recipe;
        case 'at.overlap.nimbus.recipe-updated':
            return { ...state, ...(event.data as Partial<Recipe>) };
        case 'at.overlap.nimbus.recipe-deleted':
            return null;
        default:
            return state;
    }
};
```

### Load Aggregate from Events

Load current state by replaying all events for a subject:

```typescript
import { loadAggregate } from '@nimbus/eventsourcing';

const subject = recipeSubject(slug);
const snapshot = await loadAggregate(
    eventStore,
    subject,
    null,
    recipeReducer,
);

// snapshot.state contains the current state
// snapshot.lastEventId can be used for optimistic concurrency
```

## Event Subjects

Events use subjects to organize and filter events hierarchically:

```typescript
// Subject patterns
'/recipes/carbonara'              // Specific recipe
'/recipes/*'                      // All recipes
'/users/123/preferences'          // User preferences
'/orders/456/items/*'            // All items in an order
```

Observers can subscribe to subject patterns:

```typescript
// Subscribe to all recipes
eventStore.observe({
    subjects: ['/recipes/*'],
    handler: async (event) => { /* handle event */ },
});

// Subscribe to multiple patterns
eventStore.observe({
    subjects: ['/recipes/*', '/ingredients/*'],
    handler: async (event) => { /* handle event */ },
});
```

## Best Practices

### Use Past Tense Names

Event names should describe what happened, not what should happen:

```typescript
// ✅ Good - Past tense
RecipeAddedEvent
UserRegisteredEvent
OrderShippedEvent

// ❌ Bad - Imperative
AddRecipeEvent
RegisterUserEvent
ShipOrderEvent
```

### Keep Events Immutable

Events should never be modified after creation:

```typescript
// ✅ Good - Create new event
const updatedEvent = { ...originalEvent, data: newData };

// ❌ Bad - Mutate existing event
originalEvent.data = newData;
```

### Include Correlation IDs

Maintain correlation IDs across commands and events for tracing:

```typescript
const event: RecipeAddedEvent = {
    // ...
    correlationid: command.correlationid, // Inherit from command
    // ...
};
```

### Use Meaningful Subjects

Subjects should be hierarchical and meaningful:

```typescript
// ✅ Good - Hierarchical and clear
`/recipes/${slug}`
`/users/${userId}/orders/${orderId}`

// ❌ Bad - Flat and unclear
`recipe-${slug}`
`order_${orderId}`
```

### Version Event Schemas

Include version information in event types for schema evolution:

```typescript
export const RecipeAddedEventType = 'at.overlap.nimbus.recipe-added.v1' as const;

// Later, when schema changes
export const RecipeAddedEventTypeV2 = 'at.overlap.nimbus.recipe-added.v2' as const;
```

### Handle Event Ordering

Be aware that events may arrive out of order in distributed systems. Use event IDs and timestamps when ordering matters.

## Read Model Updates

Events are commonly used to update read models in CQRS systems:

```typescript
// Update read model based on events
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
                    { $set: event.data },
                );
                break;
            case 'at.overlap.nimbus.recipe-deleted':
                await recipeReadModel.deleteOne({ slug: event.data.slug });
                break;
        }
    },
});
```

## Event Replay

Event sourcing enables replaying events to rebuild state:

```typescript
// Replay all events for a subject
const events = await eventStore.readEvents(subject);
const currentState = events.reduce(recipeReducer, null);

// Replay events up to a specific point in time
const events = await eventStore.readEvents(subject, {
    untilTime: '2024-01-01T00:00:00Z',
});
const pastState = events.reduce(recipeReducer, null);
```

## Related Patterns

- [Commands](/guide/core/commands) - Write operations that emit events
- [Queries](/guide/core/queries) - Read operations
- [Event Sourcing](/guide/eventsourcing/) - Using events as source of truth
- [CQRS](/guide/what-is-nimbus#cqrs-event-sourcing) - Separating reads and writes
