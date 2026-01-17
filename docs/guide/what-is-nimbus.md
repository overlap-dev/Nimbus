# What is Nimbus?

Nimbus is a TypeScript framework for building message-driven applications with a focus on Domain-Driven Design (DDD) and clean architecture principles. It provides the building blocks for implementing Commands, Queries, and Events while keeping business logic pure and testable.

## Philosophy

Nimbus aims to keep things simple and avoid complex OOP or FP principles.
No complex inheritance hierarchies, no dependency injection, no decorators, no magic.
Just code that is easy to understand.

:::tip Simplicity first!
Keep it as simple as possible with the least amount of external dependencies.
:::

There are already great Frameworks like [NestJS](https://nestjs.com/) and [Effect](https://effect.website/) out there for building TypeScript applications. So the question is why build another one?

While those frameworks heavily emphasize either object-oriented or functional programming patterns this comes with the cost of a steep learning curve. Nimbus aim is to have a learning curve that is as flat as possible.

:::tip Start with Nimbus
Our recommendation is to start with Nimbus and see where it takes you.  
In case you really need specific features or want to add more complexity you can always add it later.
:::

## Architecture Philosophy

Nimbus is built around the idea of a **Pure Core** and an **Imperative Shell**, aligning well with Hexagonal Architecture (Ports & Adapters) and supporting modern patterns like CQRS and Event Sourcing.

![Illustration of the pure core imperative shell architecture](/nimbus-pure-core-imperative-shell.svg)

### The Pure Core

The business logic represents the most valuable part of any application. It should be focused, testable, and free from external dependencies.

The pure core contains domain logic that:

-   Accepts type-safe inputs and returns type-safe outputs
-   Has no side effects (no I/O operations)
-   Can be tested by running functions with different inputs and comparing outputs - no mocking needed!
-   Represents the unique value proposition of the application

Example from a recipe management system:

```typescript
// Pure domain logic - no I/O, completely side-effect free
export const addRecipe = (
    command: AddRecipeCommand,
    state: RecipeState,
): {
    newState: Recipe;
    events: RecipeAddedEvent[];
} => {
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

### The Imperative Shell

The shell handles all interactions with the outside world - HTTP requests, database operations, file system access, and other I/O operations. It orchestrates the pure core by providing it with data and persisting the results.

The shell's responsibilities include:

-   Receiving external input (HTTP requests, messages, etc.)
-   Fetching data from external sources
-   Calling pure core functions
-   Persisting results
-   Sending responses

Example handler in the shell:

```typescript
// Shell layer - handles all I/O and orchestrates core logic
export const addRecipeHandler: MessageHandler<AddRecipeCommand, Recipe> =
    async (command) => {
        const subject = recipeSubject(command.data.slug);

        // Shell loads current state from event store
        const snapshot = await loadAggregate(
            eventStore,
            subject,
            null,
            recipeReducer,
        );

        // Shell calls pure core logic (no I/O happens here)
        const { newState, events } = addRecipe(command, snapshot.state);

        // Shell persists events with optimistic concurrency control
        await eventStore.writeEvents(events, {
            preconditions: snapshot.lastEventId !== undefined
                ? [{ type: 'isSubjectOnEventId', payload: { subject, eventId: snapshot.lastEventId } }]
                : [{ type: 'isSubjectPristine', payload: { subject } }],
        });

        return newState;
    };
```

### Flow of Information

Information flows in one direction: **Shell → Core → Shell**

The shell can call the core at any time, but the core never calls the shell. This unidirectional flow ensures that business logic remains pure and testable.

![Illustration of the flow of information](/nimbus-flow-of-information.svg)

In an HTTP API scenario:

1. Shell receives HTTP request
2. Shell fetches necessary data from database
3. Shell calls core business logic
4. Shell persists results to database
5. Shell sends HTTP response

For complex scenarios requiring multiple database queries with business logic in between, core functions can be composed and called sequentially by the shell.

## Message-Driven Architecture

Nimbus uses a message-driven approach with three core message types that follow the Command Query Responsibility Segregation (CQRS) pattern.

### Commands

Commands represent write operations - intentions to change system state. They are processed by command handlers that execute business logic and persist changes.

Learn more in the [Commands Guide](/guide/core/commands).

### Queries

Queries represent read operations - requests for information without changing state. Query handlers fetch and return data.

Learn more in the [Queries Guide](/guide/core/queries).

### Events

Events represent facts - things that have already happened in the system. Event handlers react to these facts to update read models, trigger notifications, or coordinate between different parts of the system.

Learn more in the [Events Guide](/guide/core/events).

## Domain-Driven Design & Hexagonal Architecture

Nimbus encourages organizing code around business domains using DDD principles and hexagonal architecture:

```
src/
├── contexts/              # Bounded contexts
│   └── recipe/
│       ├── core/          # Pure domain logic
│       │   ├── domain/    # Entities, value objects, aggregates
│       │   ├── commands/  # Command logic
│       │   ├── queries/   # Query logic
│       │   ├── events/    # Event definitions
│       │   └── ports/     # Interfaces for external dependencies
│       └── infrastructure/ # Adapters & implementation details
│           ├── http/      # HTTP handlers
│           └── repository/ # Data access
└── shared/                # Shared kernel
```

While Nimbus works well with this structure, it remains agnostic and does not enforce any specific organizational pattern. Applications can be structured as needed.

## CQRS & Event Sourcing

Command Query Responsibility Segregation (CQRS) and Event Sourcing are highly recommended patterns when using Nimbus, especially as historical data becomes increasingly valuable for AI and data analytics.

### Why CQRS?

CQRS separates write operations (commands) from read operations (queries), allowing each to be optimized independently:

-   **Commands** change state and emit events
-   **Queries** read from optimized read models
-   **Events** synchronize write and read models

### Why Event Sourcing?

Event sourcing stores every state change as an immutable event, providing:

-   Complete audit trail of all changes
-   Ability to reconstruct state at any point in time
-   Historical data for analytics and AI training
-   Natural fit with event-driven architectures

Example of an event reducer reconstructing aggregate state:

```typescript
export const recipeReducer: EventReducer<RecipeState> = (
    state: RecipeState,
    event: Event
): RecipeState => {
    switch (event.type) {
        case "at.overlap.nimbus.recipe-added":
            return event.data as Recipe;
        case "at.overlap.nimbus.recipe-updated":
            return { ...state, ...(event.data as Partial<Recipe>) };
        case "at.overlap.nimbus.recipe-deleted":
            return null;
        default:
            return state;
    }
};
```

Loading current state by replaying events:

```typescript
const snapshot = await loadAggregate(eventStore, subject, null, recipeReducer);
```

While these patterns are recommended, Nimbus does not force their use. Applications can start simple and adopt these patterns as requirements evolve.

## Package Ecosystem

Nimbus provides a modular package ecosystem:

-   **[@nimbus/core](https://jsr.io/@nimbus/core)** - Core message types, routing, validation, and logging
-   **[@nimbus/eventsourcing](https://jsr.io/@nimbus/eventsourcing)** - Event sourcing abstractions and aggregate utilities
-   **[@nimbus/eventsourcingdb](https://jsr.io/@nimbus/eventsourcingdb)** - EventSourcingDB integration for event storage
-   **[@nimbus/oak](https://jsr.io/@nimbus/oak)** - Oak HTTP framework integration
-   **[@nimbus/mongodb](https://jsr.io/@nimbus/mongodb)** - MongoDB integration for read models

Each package can be used independently or combined as needed.

## Deno & JSR

Following the principle of "keep it simple all the way," Nimbus is built with [Deno](https://deno.com) and published on [jsr.io/@nimbus](https://jsr.io/packages?search=@nimbus).

Nimbus is a TypeScript framework compatible with any Node.js runtime, though Deno is recommended for the best development experience.

## Roadmap

Future development focuses on:

-   AsyncAPI and OpenAPI specification support for schema-driven development
-   CLI tool for project initialization and code generation
-   Schema registry for contract management

## FAQ

:::info Isn't it called Functional Core, Imperative Shell?
Nimbus aims to keep things simple and avoid overly complex Object-Oriented Programming (OOP) principles. The same applies to overly complex Functional Programming (FP) principles.

The term **Pure Core** is preferred as it can follow FP patterns but does not require them.
:::
