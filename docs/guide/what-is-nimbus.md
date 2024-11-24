# What is Nimbus?

Nimbus aims to be a simple and lightweight framework for building event-driven applications in Typescript.

:::tip The Goal!
Keep it simple all the way.

No overly complex object-oriented design principles, no clunky abstractions, no magic. Just simple, easy to understand, and type-safe code.
:::

## Pure Core - Imperative Shell

You might think: "Isn't it called Functional Core, Imperative Shell?".  
And you are right. But ...

As stated above Nimbus wants to keep it simple and therefore avoid overly complex OOP (Object-Oriented-Programming) principles. The same goes for overly complex FP (Functional Programming) principles.

That is why Nimbus prefers the term **Pure Core - Imperative Shell**.

It means that the **core** of your application should be pure and side-effect free to just run your business logic without relying on any external dependencies.

As we for sure need to interact with the outside world, we need to have a **shell** that is responsible for all the I/O operations like HTTP calls, database interactions, or filesystem operations.

:::info Analogy
Think about your core as a SD-Card with all your business logic on it. This is the code why your application exists, what makes it unique.

You can now take this SD Card and put it into any shell you like. The shell is the device that reads the SD Card and enables interaction with it.
:::

As the core is what makes the value of your application, developers should be able to focus on this part of the code without wasting to much time on the shell and its replaceable parts.

Nimbus goal is to reduce the shell overhead in the first place and do the heavy lifting for you if necessary.

## Event Driven

If the real world is asynchronous, why should your application be synchronous?

## Deno & JSR

**"Keep it simple all the way."**  
That is why Nimbus is built with [Deno](https://deno.com) and published on [jsr.io](https://jsr.io/packages?search=@nimbus)

Nimbus is a Typescript framework and runs with on every Node.js compatible runtime. But it recommended to try it with Deno.
