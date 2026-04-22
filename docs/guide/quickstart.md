---
next:
    text: "Core"
    link: "/guide/core"
---

# Quickstart

To get started with Nimbus you need to install the core package and other relevant Nimbus packages based on your needs.

All packages live under the `@nimbus-cqrs` scope.

-   JSR: [@nimbus-cqrs/core](https://jsr.io/@nimbus-cqrs/core) (and the rest of the [@nimbus-cqrs](https://jsr.io/@nimbus-cqrs) scope)
-   npm: [@nimbus-cqrs/core](https://www.npmjs.com/package/@nimbus-cqrs/core) (and the rest of the [@nimbus-cqrs](https://www.npmjs.com/org/nimbus-cqrs) scope)

## Dependencies

Nimbus tries to keep dependencies as low as possible.  
Theses are the dependencies Nimbus relies on.

-   [Deno Standard Library](https://docs.deno.com/runtime/fundamentals/standard_library/) ([@std](https://jsr.io/@std))
-   [Zod](https://zod.dev/)

## Installation

Depending on your runtime you can install Nimbus with the following commands.

### Deno

```bash
deno add jsr:@nimbus-cqrs/core
```

### NPM

```bash
npm install @nimbus-cqrs/core
```

### Bun

```bash
bun add @nimbus-cqrs/core
```
