# Quickstart

To get started with Nimbus you need to install the [@nimbus/core](https://jsr.io/@nimbus/core) package and other relevant [@nimbus](https://jsr.io/@nimbus) packages based on your needs.

## Dependencies

Nimbus tries to keep dependencies as low as possible, but there are some packages that are necessary to run Nimbus.

For type validations Nimbus relies on [Zod](https://zod.dev/).  
And for logging the [@std/log](https://jsr.io/@std/log) package is used.

## Installation

Depending on your runtime you can install Nimbus with the following commands.

### Deno

```bash
deno add jsr:@nimbus/core npm:zod jsr:@std/log
```

### NPM

```bash
npm install zod
npx jsr add @nimbus/core @std/log
```

### Bun

```bash
bun add zod
bunx jsr add @nimbus/core @std/log
```
