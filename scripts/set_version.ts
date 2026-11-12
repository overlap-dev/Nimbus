#!/usr/bin/env node

/**
 * Sets the Nimbus release version across the repo.
 *
 * Thin wrapper around standard tooling: `npm version` (via `pnpm -r exec`)
 * bumps `version` in every `packages/<pkg>/package.json`. Sibling
 * dependencies and the examples use the `workspace:^` protocol, which
 * `pnpm publish` rewrites, so nothing else has to be touched.
 *
 * Usage:
 *
 *     pnpm version:set 2.0.2
 *     pnpm version:set 3.0.0-rc.1
 *
 * The leading `v` (e.g. `v2.0.2`) is stripped if present. Files are
 * edited in-place; nothing is committed or pushed.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const rawArg = process.argv[2];
if (!rawArg) {
    console.error('Usage: pnpm version:set <semver>');
    process.exit(1);
}

const version = rawArg.replace(/^v/, '');

// `npm version` also accepts bump keywords like `patch`, which would bump
// every package relative to its own version instead of setting one shared
// version. A shape check is enough to reject those; `npm version` validates
// the full SemVer grammar.
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(version)) {
    console.error(
        `Invalid version "${rawArg}": expected a literal SemVer like 2.0.2 or 3.0.0-rc.1`,
    );
    process.exit(1);
}

// The child's output is forwarded as-is, so on failure its own error
// message has already been printed and we just propagate the exit code.
const run = (command: string, args: string[]) => {
    try {
        execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' });
    } catch (error) {
        const status = (error as { status?: number | null }).status;
        process.exit(status ?? 1);
    }
};

console.log(`Setting Nimbus version to ${version}\n`);

run('pnpm', [
    '-r',
    '--filter',
    './packages/*',
    'exec',
    'npm',
    'version',
    version,
    '--no-git-tag-version',
]);

console.log('\nDone. Review with `git diff` before committing.');
