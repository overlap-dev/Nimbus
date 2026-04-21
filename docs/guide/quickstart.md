# Quickstart

To get started with Nimbus you need to install the core package and other relevant Nimbus packages based on your needs.

The packages are published on both registries:

-   JSR: [@nimbus/core](https://jsr.io/@nimbus/core) (and the rest of the [@nimbus](https://jsr.io/@nimbus) scope)
-   npm: [@nimbus-cqrs/core](https://www.npmjs.com/package/@nimbus-cqrs/core) (and the rest of the [@nimbus-cqrs](https://www.npmjs.com/org/nimbus-cqrs) scope)

The `@nimbus` scope on JSR and `@nimbus-cqrs` on npm refer to the same library — only the scope name differs.

## Dependencies

Nimbus tries to keep dependencies as low as possible.  
Theses are the dependencies Nimbus relies on.

-   [Deno Standard Library](https://docs.deno.com/runtime/fundamentals/standard_library/) ([@std](https://jsr.io/@std))
-   [Zod](https://zod.dev/)

## Installation

Depending on your runtime you can install Nimbus with the following commands.

### Deno

```bash
deno add jsr:@nimbus/core
```

### NPM

```bash
npm install @nimbus-cqrs/core
```

### Bun

```bash
bun add @nimbus-cqrs/core
```
