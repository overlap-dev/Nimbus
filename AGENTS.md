# Add and adjust tests

Whenever new functionality is added, add tests for it afterwards.

When functionality is changed, adjust the tests or add new test cases accordingly.

Tests use the built-in Node.js test runner (`node:test`) together with `node:assert/strict`. Test files live next to the code they cover and end in `.test.ts`.

# Documentation

Documentation is handled in two ways:

-   Technical documentation as JSDoc comments in the code. This is mandatory for all publicly exported elements so editors and documentation generators can pick it up.
-   User documentation in the docs folder. This is targeted for users in a more guided way.

Make sure to update the documentation when functionality is changed or added.

# Build, Type Check, Format, Lint & Test

The repository is a pnpm workspace. Whenever something is changed in the examples or packages, run the following commands from the repository root to build, type check, format, lint and test the code. Dependent packages type check against the built `dist/` output of their siblings, so `pnpm build` has to run first.

```
pnpm install
pnpm build
pnpm check
pnpm lint
pnpm test
```

`pnpm lint` runs `biome ci` (formatting and linting, read-only). Use `pnpm fmt` to apply formatting and safe lint fixes.
