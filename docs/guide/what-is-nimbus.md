# What is Nimbus?

Nimbus is a lightweight TypeScript framework for building event-driven applications. It provides type-safe messaging patterns (Commands, Queries, Events) following the [CloudEvents](https://cloudevents.io/) specification, with built-in observability powered by [OpenTelemetry](https://opentelemetry.io/).

## Philosophy

Nimbus is built on a few core principles that set it apart from other TypeScript frameworks.

**Simplicity**

Nimbus aims to keep things simple and to avoid overly complex OOP or FP principles. No complex inheritance hierarchies, no dependency injection, no decorators. Just explicit code that is easy to understand and reason about.

**No Framework Magic**

Three lines of code to build a whole API is great, until something goes wrong and you have no clue why the magic stopped working.

**Flat and easy learning curve**

There are already great Frameworks like [NestJS](https://nestjs.com/) and [Effect](https://effect.website/) out there for building TypeScript applications.

While those frameworks heavily emphasize either object-oriented or functional programming patterns this comes with the cost of a steep learning curve. Nimbus aims to have a learning curve that is as flat as possible.

Be productive right from the start.

## Who Is This For?

Nimbus is a good fit if you are:

-   Building event-driven applications
-   Looking for explicit, traceable code without hidden magic
-   Wanting built-in observability without complex setup
-   Preferring a lightweight framework over heavyweight solutions

## Key Features

-   **CloudEvents-based messaging** - Commands, Queries, and Events following the industry-standard [CloudEvents](https://cloudevents.io/) specification
-   **Built-in observability** - Logging, tracing, and metrics via [OpenTelemetry](https://opentelemetry.io/) with zero boilerplate
-   **Type-safe validation** - Message validation with [Zod](https://zod.dev/) schemas
-   **MongoDB integration** - Repository pattern and CRUD operations with automatic tracing
-   **Hono middleware** - Ready-to-use middleware for HTTP APIs
-   **Runtime flexibility** - Deno-first with NPM and Bun support

## A Taste of Nimbus

Here's a quick look at how you define and handle a command in Nimbus:

```typescript
import { commandSchema, createCommand, getRouter } from "@nimbus/core";
import { z } from "zod";

// Define a type-safe command schema
const addUserCommandSchema = commandSchema.extend({
    type: z.literal("com.example.add-user"),
    data: z.object({
        email: z.string().email(),
        name: z.string(),
    }),
});

type AddUserCommand = z.infer<typeof addUserCommandSchema>;

// Register a handler with automatic validation and tracing
const router = getRouter("MyRouter");

router.register(
    "com.example.add-user",
    async (command: AddUserCommand) => {
        // Your business logic here
        return { userId: "123", email: command.data.email };
    },
    addUserCommandSchema
);
```

## Architecture Recommendation

It would be valuable to build your application around the idea of a **Pure Core** and an **Imperative Shell**. It aligns well with Hexagonal Architecture (Ports & Adapters) and is a good foundation for patterns like CQRS and Event Sourcing.

![Illustration of the pure core imperative shell architecture](/nimbus-pure-core-imperative-shell.svg)

### The Pure Core

The business logic represents the most valuable part of any application. It should be focused, testable, and free from external dependencies.

The pure core contains domain logic that:

-   Accepts type-safe inputs and returns type-safe outputs
-   Has no side effects (no I/O operations)
-   Can be tested by running functions with different inputs and comparing outputs - no mocking needed!
-   Represents the unique value proposition of the application

### The Imperative Shell

The shell handles all interactions with the outside world - HTTP requests, database operations, file system access, and other I/O operations. It orchestrates the pure core by providing it with data and persisting the results.

The shell's responsibilities include:

-   Receiving external input (HTTP requests, messages, etc.)
-   Fetching data from external sources
-   Calling pure core functions
-   Persisting results
-   Sending responses

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

## Testing Recommendation

-   Unit tests for the pure core.
-   E2E tests to ensure the whole system works.

As the name "pure" core already implies, no side effects are allowed. This makes it easy to test the core by running functions with different inputs and comparing outputs - no mocking needed!

Also the core is the most important part of your application as it hold your whole business logic. So fast and easy to write unit tests give you the most bang for your buck.

End to end tests will ensure all parts of your application work together as expected.
