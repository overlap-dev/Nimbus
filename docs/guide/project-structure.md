# Project Structure

Nimbus is not opinionated about the project structure and you can adjust it to your needs. But here is a suggestion on how to structure your project.

At first we want to separate the core logic from the shell implementation.  
See [Pure Core - Imperative Shell](/guide/what-is-nimbus#pure-core-imperative-shell) for more information.

Afterwards we want to separate the different contexts of our problem based on the Domain Driven Design (DDD) principles.

```
/-
  |- src
    |- core
      |- context
        |- entity
    |- shell
      |- context
        |- entity
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

### `/src/core` Core

The core directory contains the logic and code that is the heart - or better say brain? - of your application. Here is where the business logic lives and whats makes your application unique.

We want to keep this part of the code pure.
Pure in the sense of a [pure function](https://en.wikipedia.org/wiki/Pure_function).

::: tip
If it is `async` it does NOT belong here 99% of the time.
:::

### `/src/shell` Shell

The shell directory contains the code that is responsible for the interaction with the outside world. Also called I/O (Input/Output).

Mostly there will be one file e.g. the command handler - or call it the controller - which is the glue between the different core functions and the I/O functions like HTTP calls, and database or file interactions.

::: tip
This is the place for all the `async` functions.
:::

### `/src/core/context` Context

Multiple context directories are used to separate different parts of the application.

In the terms of DDD (Domain Driven Design) these are called Bounded Contexts.  
One would try to keep a 1:1 mapping between a Bounded Context and a Sub-Domain but this is not a strict rule and can be adjusted to the needs of the project.

::: tip
To keep it simple a context is the largest group of things that belong together when you think about dividing your application into smaller parts.
:::
