---
description: Install @nimbus-cqrs packages from npm for Node.js, Bun, or Deno; core is required, other packages are optional by need.
---

# Quickstart

To get started with Nimbus you need to install the core package and other relevant Nimbus packages based on your needs.

All packages live under the `@nimbus-cqrs` scope on npm: [@nimbus-cqrs/core](https://www.npmjs.com/package/@nimbus-cqrs/core) (and the rest of the [@nimbus-cqrs](https://www.npmjs.com/org/nimbus-cqrs) scope).

The packages are published as plain ESM with bundled type declarations and run on Node.js 24+, Bun and Deno.

## Dependencies

Nimbus tries to keep dependencies as low as possible.  
Theses are the dependencies Nimbus relies on.

-   [Zod](https://zod.dev/)
-   [OpenTelemetry API](https://opentelemetry.io/docs/languages/js/)
-   [ulid](https://github.com/ulid/javascript) for message IDs
-   [picocolors](https://github.com/alexeyraspopov/picocolors) for colored console output

## Installation

Depending on your package manager or runtime you can install Nimbus with the following commands.

### npm

```bash
npm install @nimbus-cqrs/core
```

### pnpm

```bash
pnpm add @nimbus-cqrs/core
```

### Bun

```bash
bun add @nimbus-cqrs/core
```

### Deno

```bash
deno add npm:@nimbus-cqrs/core
```
