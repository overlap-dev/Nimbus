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
3. Make sure you have Node.js 26 (see `.nvmrc`) and [pnpm](https://pnpm.io/)
   installed. With [Corepack](https://nodejs.org/api/corepack.html) enabled,
   the pnpm version pinned in `package.json` is picked up automatically:
    ```sh
    corepack enable
    ```
4. Install dependencies:
    ```sh
    pnpm install
    ```
5. Create a new branch for your changes

## Development

### Code Quality

Before submitting a pull request, make sure to run the following checks from the
repository root:

```sh
pnpm build
pnpm check
pnpm lint
pnpm test
```

- `pnpm build` compiles every package with `tsc` into its `dist/` folder.
  Dependent packages type check against the built output of their siblings,
  so always build first.
- `pnpm check` runs `tsc --noEmit` for every package and the example app,
  including the test files.
- `pnpm lint` runs [Biome](https://biomejs.dev/) in CI mode (formatting and
  linting, read-only). Use `pnpm fmt` to apply formatting and safe fixes.
- `pnpm test` runs the test suites with the built-in Node.js test runner
  (`node --test`). The `@nimbus-cqrs/eventsourcingdb` suite starts
  EventSourcingDB containers via Testcontainers and therefore needs Docker.
  It runs once against `thenativeweb/eventsourcingdb:1.2.0` (v1 HTTP API)
  and once against `thenativeweb/eventsourcingdb:preview` (upcoming 1.3
  with the v2 HTTP API); both images are pulled on the first run.

### Documentation

- Add JSDoc comments to all publicly exported elements
- Update user documentation in the `docs/` folder when adding or changing
  functionality
- For new or updated guide pages, add YAML `description` frontmatter (1–3
  sentences summarizing the page for humans, SEO, and LLM index files)
- When changing `examples/eventsourcing-demo`, update GitHub line-range links in
  [docs/guide/in-depth-example.md](docs/guide/in-depth-example.md) if affected symbols moved

The docs site generates LLM-friendly artifacts on build (`llms.txt`, `llms-full.txt`, and per-page `.md` mirrors) via `vitepress-plugin-llms`.

The docs are part of the pnpm workspace. To locally preview the documentation,
run the following command inside the `docs/` directory:

```sh
pnpm dev
```

The documentation will be available at `http://localhost:5173` when using `pnpm dev`.

To verify the production build (including `llms.txt`):

```sh
pnpm build
pnpm preview
```

The preview of the build will be available at `http://localhost:4173`.  
You can check the `llms.txt` and `llms-full.txt` under `http://localhost:4173/llms.txt` and `http://localhost:4173/llms-full.txt`.

### Examples

`examples/eventsourcing-demo` is part of the pnpm workspace and consumes the
packages directly from source via `workspace:` dependencies. Run it with
`pnpm dev` inside its directory (it needs MongoDB and EventSourcingDB, see
below and its `.env.example`).

`examples/node-demo` is intentionally **not** part of the workspace. It uses
plain npm and consumes the *published* `@nimbus-cqrs/*` packages, so it acts
as a smoke test for what consumers actually install. It is excluded from Biome
and the workspace scripts. To work on it:

```sh
cd examples/node-demo && npm install && npm run dev
```

Refer to the example's README for details.

### EventSourcingDB

For additional information check the official documentation on [how to install](https://docs.eventsourcingdb.io/getting-started/installing-eventsourcingdb/) and [how to run EventSourcingDB](https://docs.eventsourcingdb.io/getting-started/running-eventsourcingdb/) on your local machine.

**Install EventSourcingDB**

```shell
docker pull thenativeweb/eventsourcingdb
```

**Start EventSourcingDB with temporary data**

```bash
docker run -it -p 3000:3000 \
  thenativeweb/eventsourcingdb run \
  --api-token=secret \
  --data-directory-temporary \
  --http-enabled \
  --https-enabled=false \
  --with-ui
```

**Start EventSourcingDB with persistent data**

The data will be stored in the `esdb-data` directory which is ignored by Git.

```bash
docker run -it \
  -p 3000:3000 \
  -v ./esdb-data:/var/lib/esdb \
  thenativeweb/eventsourcingdb run \
  --api-token=secret \
  --data-directory=/var/lib/esdb \
  --http-enabled \
  --https-enabled=false \
  --with-ui
```

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

## Release a new Version

Branch from `main` into a new release branch `release/<VERSION>`.

Stick to the [Semantic Versioning](https://semver.org/) specification.

Bump the version across the repo with the helper script:

```sh
pnpm version:set <VERSION>
# e.g.
pnpm version:set 2.0.2
pnpm version:set 3.0.0-rc.1
```

This updates the `version` field in every `packages/<PACKAGE_NAME>/package.json`
and rewrites the `@nimbus-cqrs/*` dependencies in
`examples/node-demo/package.json` to the new caret range.

Commit, push and open a pull request to `main`.
Squash and merge the pull request with the message `chore: release <VERSION>`.

Create a new release on GitHub and the `publish.yaml` workflow will build the
packages and publish the new version to npm via
[trusted publishing](https://docs.npmjs.com/trusted-publishers/). `pnpm -r publish` publishes the packages in dependency
order and skips versions that already exist on the registry, so re-running the
workflow after a partial failure is safe.

### Manually publish to npm

```sh
pnpm build
pnpm -r publish --access public --no-git-checks
```
