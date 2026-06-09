# Add and adjust tests

Whenever new functionality is added, add tests for it afterwards.

When functionality is changed, adjust the tests or add new test cases accordingly.

# Documentation

Documentation is handled in two ways:

-   Technical documentation as JSDoc comments in the code. This is mandatory for all publicly exported elements so JSR can generate documentation based on it.
-   User documentation in the docs folder. This is targeted for users in a more guided way.

Make sure to update the documentation when functionality is changed or added.

# Format, Lint, Type Check & Test

Whenever something is changed in the examples or packages, run the following commands to type check, format, lint and test the code. Running these commands from the repository root will check all examples and packages.

```
deno check
deno fmt --check
deno lint
deno test --allow-all
```
