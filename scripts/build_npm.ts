#!/usr/bin/env -S deno run -A

/**
 * Builds an npm-compatible distribution for every Nimbus package using
 * `@deno/dnt` (Deno to Node Transform).
 *
 * Each package is emitted into `dist/npm/<pkg>/` with ESM output, type
 * declarations, a generated `package.json`, the root `LICENSE`, and the
 * package's `README.md`. The resulting folder is ready to be published
 * with `npm publish`.
 *
 * Usage:
 *
 *     deno task build:npm                # use versions from each deno.json
 *     deno task build:npm 2.1.0          # override version for every package
 *     deno run -A scripts/build_npm.ts   # equivalent to the first form
 *
 * Packages are published under the `@nimbus-cqrs` scope on both JSR and
 * npm. Sibling cross-package imports (e.g. `@nimbus-cqrs/core` consumed by
 * `@nimbus-cqrs/eventsourcingdb`) are rewritten in the dnt output so the
 * published npm package depends on its sibling npm twin instead of
 * inline-bundling the sibling source.
 */

import { build, emptyDir } from 'jsr:@deno/dnt@^0.42.3';
import { copy } from 'jsr:@std/fs@^1.0.13';
import {
    dirname,
    fromFileUrl,
    join,
    resolve,
} from 'jsr:@std/path@^1.0.9';

const SCOPE = '@nimbus-cqrs';

const repoRoot = resolve(dirname(fromFileUrl(import.meta.url)), '..');

interface PackageDef {
    /** Folder name under `packages/` */
    dir: string;
    /** Scoped package name (identical on JSR and npm) */
    name: string;
    /** Description used in the generated `package.json` */
    description: string;
    /**
     * Keywords used in the generated `package.json` (npm only). JSR has no
     * equivalent metadata field, so these never end up on jsr.io.
     */
    keywords: string[];
}

const SHARED_KEYWORDS = [
    'nimbus',
    'cqrs',
    'event-sourcing',
    'event-driven',
    'typescript',
];

/**
 * The list is intentionally ordered so that dependencies are built (and
 * later published) before dependents.
 */
const packages: PackageDef[] = [
    {
        dir: 'core',
        name: `${SCOPE}/core`,
        description:
            'Simplify Event-Driven Applications - Core building blocks of the Nimbus framework.',
        keywords: [
            ...SHARED_KEYWORDS,
            'command',
            'query',
            'event',
        ],
    },
    {
        dir: 'utils',
        name: `${SCOPE}/utils`,
        description:
            'Simplify Event-Driven Applications - Utility helpers shared across the Nimbus framework.',
        keywords: [
            ...SHARED_KEYWORDS,
            'utils',
        ],
    },
    {
        dir: 'mongodb',
        name: `${SCOPE}/mongodb`,
        description:
            'Simplify Event-Driven Applications - MongoDB integration for the Nimbus framework.',
        keywords: [
            ...SHARED_KEYWORDS,
            'mongodb',
            'database',
        ],
    },
    {
        dir: 'hono',
        name: `${SCOPE}/hono`,
        description:
            'Simplify Event-Driven Applications - Hono integration for the Nimbus framework.',
        keywords: [
            ...SHARED_KEYWORDS,
            'hono',
            'http',
            'middleware',
            'api',
        ],
    },
    {
        dir: 'eventsourcingdb',
        name: `${SCOPE}/eventsourcingdb`,
        description:
            'Simplify Event-Driven Applications - EventSourcingDB integration for the Nimbus framework.',
        keywords: [
            ...SHARED_KEYWORDS,
            'eventsourcingdb',
            'database',
            'event-store',
            'event-stream',
        ],
    },
];

const cliVersion = Deno.args[0]?.replace(/^v/, '');

/**
 * Walk a directory and return every `.ts` file that is not a test file.
 */
async function collectSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    for await (const entry of Deno.readDir(dir)) {
        const full = join(dir, entry.name);
        if (entry.isDirectory) {
            files.push(...(await collectSourceFiles(full)));
        } else if (
            entry.isFile &&
            entry.name.endsWith('.ts') &&
            !entry.name.endsWith('.test.ts')
        ) {
            files.push(full);
        }
    }
    return files;
}

/**
 * Returns the set of sibling Nimbus packages that the given package's
 * non-test source code imports from.
 */
async function detectSiblingDeps(pkgRoot: string): Promise<Set<string>> {
    const sources = await collectSourceFiles(join(pkgRoot, 'src'));
    const siblings = new Set<string>();
    // Anchor the match to the start of a line (optionally preceded by
    // whitespace) so import-like strings inside JSDoc comments (which start
    // with ` * `) are not mistakenly treated as real imports.
    const importPattern = new RegExp(
        `^\\s*import\\s.*?from\\s+['"](${SCOPE}\\/[a-z][a-z0-9-]*)['"]`,
        'gm',
    );
    for (const file of sources) {
        const text = await Deno.readTextFile(file);
        for (const match of text.matchAll(importPattern)) {
            siblings.add(match[1]);
        }
    }
    return siblings;
}

/**
 * Recursively walks a directory and yields the absolute path of every file.
 */
async function* walkFiles(dir: string): AsyncGenerator<string> {
    for await (const entry of Deno.readDir(dir)) {
        const full = join(dir, entry.name);
        if (entry.isDirectory) {
            yield* walkFiles(full);
        } else if (entry.isFile) {
            yield full;
        }
    }
}

/**
 * Rewrites every reference to a vendored Nimbus sibling package in the dnt
 * output (e.g. `../deps/jsr.io/@nimbus-cqrs/core/2.0.0/src/index.js`) back
 * to the bare npm specifier (`@nimbus-cqrs/core`) so the published package
 * depends on its sibling instead of bundling a copy of it. Also deletes
 * the vendored copies once they are no longer referenced.
 */
async function rewriteSiblingReferences(
    npmOut: string,
    siblings: Set<string>,
    version: string,
): Promise<void> {
    if (siblings.size === 0) return;

    const siblingPathRegex = new RegExp(
        `(?:\\.\\./)+deps/jsr\\.io/(${SCOPE}\\/[a-z][a-z0-9-]*)/${
            version.replace(/\./g, '\\.')
        }/src/index\\.(?:js|d\\.ts)`,
        'g',
    );

    for await (const file of walkFiles(npmOut)) {
        if (
            !file.endsWith('.js') &&
            !file.endsWith('.d.ts') &&
            !file.endsWith('.js.map') &&
            !file.endsWith('.d.ts.map')
        ) {
            continue;
        }
        const original = await Deno.readTextFile(file);
        const rewritten = original.replace(
            siblingPathRegex,
            (_, sibling: string) => sibling,
        );
        if (rewritten !== original) {
            await Deno.writeTextFile(file, rewritten);
        }
    }

    // Drop the vendored copies of the sibling packages now that nothing
    // references them anymore.
    for (const subdir of ['esm', 'src']) {
        const vendoredRoot = join(npmOut, subdir, 'deps', 'jsr.io', SCOPE);
        try {
            await Deno.remove(vendoredRoot, { recursive: true });
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) throw error;
        }
    }
}

const originalCwd = Deno.cwd();

const npmDistRoot = join(repoRoot, 'dist', 'npm');
await emptyDir(npmDistRoot);

for (const pkg of packages) {
    const pkgRoot = join(repoRoot, 'packages', pkg.dir);
    const npmOut = join(npmDistRoot, pkg.dir);
    const denoJson = JSON.parse(
        await Deno.readTextFile(join(pkgRoot, 'deno.json')),
    );
    const version = cliVersion ?? denoJson.version;

    const siblings = await detectSiblingDeps(pkgRoot);
    siblings.delete(pkg.name);

    // dnt's resolver delegates to Deno's module resolver, which honors the
    // root `deno.json`'s `workspace` field and would resolve bare
    // `@nimbus-cqrs/<sibling>` specifiers to local source files. To get a
    // clean resolution that points at the published JSR packages instead,
    // we copy the package source into a temporary directory that lives
    // outside the workspace and run dnt from there.
    const tmpRoot = await Deno.makeTempDir({ prefix: 'nimbus-dnt-' });

    const tmpSrc = join(tmpRoot, 'src');
    await copy(join(pkgRoot, 'src'), tmpSrc, { overwrite: true });

    const tmpImports: Record<string, string> = {
        ...(denoJson.imports ?? {}),
    };
    for (const sibling of siblings) {
        tmpImports[sibling] = `jsr:${sibling}@^${version}`;
    }

    await Deno.writeTextFile(
        join(tmpRoot, 'deno.json'),
        JSON.stringify(
            {
                name: denoJson.name,
                version,
                exports: './src/index.ts',
                imports: tmpImports,
            },
            null,
            2,
        ),
    );

    // dnt cannot reliably remap a whole JSR package to an npm package via
    // its `mappings` option (it panics when the JSR module graph contains
    // redirects, see https://github.com/denoland/dnt/blob/0.42.3/rs-lib/src/mappings.rs#L129).
    // Instead, we let dnt vendor the sibling package inline and rewrite the
    // resulting output below to depend on the published npm twin.
    //
    // The sibling dependencies are added to package.json *after* dnt's own
    // `npm install` step because the published `@nimbus-cqrs/<sibling>`
    // packages may not exist on the registry yet (e.g. on the first publish
    // of a new version).

    console.log(`\n[build_npm] Building ${pkg.name}@${version}`);

    await emptyDir(npmOut);

    Deno.chdir(tmpRoot);
    try {
        await build({
            entryPoints: ['./src/index.ts'],
            outDir: npmOut,
            // Source code does not use any `Deno.*` globals (only test files
            // do, and we exclude tests below) so no runtime shims are needed.
            shims: {},
            test: false,
            // ESM-only build: skip the CommonJS twin to avoid the dual
            // package hazard (https://nodejs.org/api/packages.html#dual-package-hazard)
            // for classes/singletons such as `GenericException` and the
            // logger registry. Node 18+ supports this natively; older CJS
            // consumers can use dynamic `import()`.
            scriptModule: false,
            typeCheck: 'single',
            // The packages target Node.js (and other runtimes that implement
            // the standard Web/Node globals). The DOM and DOM.Iterable libs
            // provide Web APIs such as `crypto`, `console`, `TextEncoder`,
            // `performance`, and the iterator methods on `Headers`. ES2023
            // is required for `Array.prototype.toSorted` used by `@std/text`.
            compilerOptions: {
                lib: ['ES2023', 'DOM', 'DOM.Iterable'],
                target: 'ES2022',
            },
            mappings: {},
            package: {
                name: pkg.name,
                version,
                description: pkg.description,
                keywords: pkg.keywords,
                license: denoJson.license,
                author: denoJson.author,
                homepage: denoJson.homepage,
                repository: denoJson.repository,
                bugs: denoJson.bugs,
                engines: {
                    node: '>=20',
                },
                devDependencies: {
                    '@types/node': '^22.0.0',
                },
            },
            async postBuild() {
                await Deno.copyFile(
                    join(repoRoot, 'LICENSE'),
                    join(npmOut, 'LICENSE'),
                );
                await Deno.copyFile(
                    join(pkgRoot, 'README.md'),
                    join(npmOut, 'README.md'),
                );
            },
        });

        // Rewrite the vendored sibling package paths to use the bare npm
        // package name and remove the now-orphaned vendored copies.
        await rewriteSiblingReferences(npmOut, siblings, version);

        // Add sibling Nimbus packages to the generated package.json. We do
        // this here (rather than via dnt's `package.dependencies`) so that
        // dnt's own `npm install` step does not try to fetch packages that
        // may not yet be on the registry (e.g. when publishing a new
        // version).
        if (siblings.size > 0) {
            const generatedPkgPath = join(npmOut, 'package.json');
            const generatedPkg = JSON.parse(
                await Deno.readTextFile(generatedPkgPath),
            );
            generatedPkg.dependencies = {
                ...(generatedPkg.dependencies ?? {}),
            };
            for (const sibling of siblings) {
                generatedPkg.dependencies[sibling] = `^${version}`;
            }
            await Deno.writeTextFile(
                generatedPkgPath,
                JSON.stringify(generatedPkg, null, 2) + '\n',
            );
        }
    } finally {
        Deno.chdir(originalCwd);
        await Deno.remove(tmpRoot, { recursive: true });
    }
}

console.log('\n[build_npm] All packages built successfully.');
