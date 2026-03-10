# Contributing to Nimbus

We appreciate your interest in contributing to Nimbus! This document provides
guidelines and information about contributing to this project.

## Contributor License Agreement (CLA)

Before we can accept your contributions, you must sign our
[Contributor License Agreement (CLA)](CLA.md). The CLA grants
Overlap GmbH & Co KG the necessary rights to distribute your contributions as
part of Nimbus.

When you submit your first pull request, the CLA Assistant bot will
automatically ask you to sign the CLA by posting a comment. Simply follow the
instructions in that comment to complete the process.

## Reporting Issues

If you find a bug or have a feature request, please
[open an issue](https://github.com/overlap-dev/Nimbus/issues) on GitHub.

## Reporting Security Issues

If you discover a security vulnerability, please **do not** open a public
issue. Instead, please follow the process described in our
[Security Policy](SECURITY.md).

## Issue Before Pull Request

Before you start working on a new feature or a significant change, please
[open an issue](https://github.com/overlap-dev/Nimbus/issues) first to discuss
your idea. This helps ensure that your approach aligns with the project's
direction and avoids spending time on changes that may not be accepted. Bug fixes
for clearly broken behavior can usually skip this step.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies:
    ```sh
    deno install
    ```
4. Create a new branch for your changes

## Development

### Code Quality

Before submitting a pull request, make sure to run the following checks from the
repository root:

```sh
deno check
deno fmt --check
deno lint
deno test --allow-all
```

### Documentation

-   Add JSDoc comments to all publicly exported elements
-   Update user documentation in the `docs/` folder when adding or changing
    functionality

## Submitting Changes

1. Commit your changes with clear, descriptive commit messages
2. Push your branch to your fork
3. Open a pull request against the `main` branch
4. Ensure all CI checks pass
5. Sign the CLA when prompted (first-time contributors only)

## License

By contributing to Nimbus, you agree that your contributions will be licensed
under the [Apache License 2.0](LICENSE), and you grant Overlap GmbH & Co KG
additional rights as described in the [CLA](CLA.md).
