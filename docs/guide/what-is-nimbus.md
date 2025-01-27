# What is Nimbus?

:::tip The Goal: Keep it simple all the way!

No complex object-oriented patterns, no clunky abstractions, no magic.  
Just easily understandable and type-safe code.
:::

Nimbus aims to be a simple framework for building event-driven applications in Typescript.

## Pure Core - Imperative Shell

![Illustration of the pure core imperative shell architecture](/nimbus-pure-core-imperative-shell.svg)

### The Pure Core

As our business logic - the things that make our application unique - is the most valuable part of our code, we should be able to focus on it without worrying about outside dependencies or side effects interfering with it.

So the main goal is to keep all the business logic inside the pure core of our application.

The core only accepts type safe inputs and returns type safe outputs. It is side-effect free and can be tested easily by running functions with different inputs and comparing the outputs.

### The Imperative Shell

As we for sure need to interact with the outside world, we need to have a place that is responsible for all the I/O operations like HTTP calls, database interactions, or filesystem operations.

This place is in the shell of our application. It is responsible for the side effects and connects all external interactions with the pure core.

Nimbus goal is to reduce the shell overhead in the first place and do the heavy lifting for you if necessary.

### Shell to Core to Shell

The flow of information always goes from the shell to the core and back to the shell.
This means the shell can call the core at any time but the core will never call the shell.

![Illustration of the flow of information](/nimbus-flow-of-information.svg)

When we look at an example of an HTTP API, the shell handles the incoming HTTP request, reads from the Database, calls the core, writes changes to the Database, and sends the response back to the client.

Sometimes it is necessary to run business logic with some information from the database before executing another database query based on the logic's result. In this case the core functions can be split into multiple parts so the shell can call them in the right order.

### Thoughts?

:::info Isn't it called Functional Core, Imperative Shell?
As stated above Nimbus goal is to keep it simple and therefore avoid overly complex OOP (Object-Oriented-Programming) principles. The same goes for overly complex FP (Functional Programming) principles.

That is why Nimbus prefers the term **Pure Core** as it can, but not have to follow FP patterns.
:::

:::info Isn't it called a Hexagonal Architecture?
Nimbus can fit nicely into an App with Hexagonal Architecture.
But if you do not want to follow this pattern, you are still able to use Nimbus without defining ports and adapters for everything.
:::

## Event Driven

If the real world is asynchronous, why should your application be synchronous?

## Deno & JSR

**"Keep it simple all the way."**
That is why Nimbus is built with [Deno](https://deno.com) and published on [jsr.io](https://jsr.io/packages?search=@nimbus)

Nimbus is a Typescript framework and runs with every Node.js compatible runtime. But it is recommended to try it with Deno.
