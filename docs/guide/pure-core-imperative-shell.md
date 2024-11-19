# Pure Core - Imperative Shell

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam.

## Example Folder Structure

```
/-
  |- src
    |- context
      |- core
      |- shell
      |- types
    |- main.ts
  |- .gitignore
  |- deno.json
  |- deno.lock
  |- README.md
```

### `/` Root

The root directory of the project.  
Contains the `deno.json` and other configuration files like `.gitignore`.

### `/src` Source

The source directory is the place where all the source code of the project lives.

### `/src/context` Context

Multiple context directories are used to separate different parts of the application.

In the terms of DDD (Domain Driven Design) these are called Bounded Contexts.  
One would try to keep a 1:1 mapping between a Bounded Context and a Sub-Domain but this is not a strict rule and can be adjusted to the needs of the project.

::: tip
To keep it simple a context is the largest group of things that belong together when you think about dividing your problem solution into smaller parts.
:::

### `/src/context/entity/core` Core

The core directories contain the logic and code that is the heart - or better say brain? - of your application. Here is where the business logic lives and whats makes your application unique.

We want to keep this part of the code pure.
Pure in the sense of a [pure function](https://en.wikipedia.org/wiki/Pure_function).

::: tip
If it is `async` it does NOT belong here.
:::

### `/src/context/entity/shell` Shell

The shell directories contain the code that is responsible for the interaction with the outside world. Also called I/O (Input/Output).

Mostly there will be one file e.g. the command handler - or call it the controller - which is the glue between the different core functions and the I/O functions like HTTP calls, and database or file interactions.

::: tip
This is the place for all the `async` functions.
:::

### `/src/context/entity/types` Types

As the name suggests, the types directories contain the types.
