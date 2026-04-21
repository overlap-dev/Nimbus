#!/usr/bin/env -S deno run -A

/**
 * Sets the Nimbus release version across the repo.
 *
 * Updates:
 *   - `version` in every `packages/<pkg>/deno.json`
 *   - every `@nimbus-cqrs/*` dependency in `examples/{node,bun}-demo/package.json`
 *
 * The version is written verbatim into `deno.json`, and as a caret
 * range (`^<version>`) into the example `package.json` files.
 *
 * Usage:
 *
 *     deno task version:set 2.0.2
 *     deno task version:set 3.0.0-rc.1
 *     deno run -A scripts/set_version.ts 2.0.2     # equivalent
 *
 * The leading `v` (e.g. `v2.0.2`) is stripped if present. Files are
 * edited in-place; nothing is committed or pushed.
 */

import { dirname, fromFileUrl, join, resolve } from 'jsr:@std/path@^1.0.9';

const repoRoot = resolve(dirname(fromFileUrl(import.meta.url)), '..');

const SCOPE = '@nimbus-cqrs';

const denoPackages = [
    'core',
    'utils',
    'mongodb',
    'hono',
    'eventsourcingdb',
];

const npmExamples = [
    'node-demo',
    'bun-demo',
];

// Loose SemVer 2.0.0 check, sufficient to catch typos like "2.0" or
// "2.0.0.beta". The full grammar is documented at https://semver.org/.
const SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;

const rawArg = Deno.args[0];
if (!rawArg) {
    console.error('Usage: deno task version:set <semver>');
    console.error('Example: deno task version:set 2.0.2');
    console.error('         deno task version:set 3.0.0-rc.1');
    Deno.exit(1);
}

const version = rawArg.replace(/^v/, '');
if (!SEMVER_REGEX.test(version)) {
    console.error(`Error: "${rawArg}" is not a valid SemVer version.`);
    Deno.exit(1);
}

/**
 * Replaces the top-level `"version": "..."` field in a JSON file while
 * preserving the surrounding formatting (indentation, key order,
 * trailing newline).
 */
async function updateDenoJson(path: string): Promise<boolean> {
    const original = await Deno.readTextFile(path);
    const updated = original.replace(
        /^(\s*)"version"\s*:\s*"[^"]*"/m,
        (_match, indent: string) => `${indent}"version": "${version}"`,
    );
    if (updated === original) return false;
    await Deno.writeTextFile(path, updated);
    return true;
}

/**
 * Rewrites every `"@nimbus-cqrs/<pkg>": "<range>"` entry in a
 * `package.json` to use the new caret range. Other dependencies are
 * left untouched. Returns the list of bumped specifiers.
 */
async function updateExamplePackageJson(path: string): Promise<string[]> {
    const original = await Deno.readTextFile(path);
    const bumped: string[] = [];
    const updated = original.replace(
        new RegExp(
            String.raw`("${SCOPE}\/[a-z][a-z0-9-]*"\s*:\s*")[^"]+(")`,
            'g',
        ),
        (_match, prefix: string, suffix: string) => {
            const nameMatch = /"([^"]+)"/.exec(prefix);
            if (nameMatch) bumped.push(nameMatch[1]);
            return `${prefix}^${version}${suffix}`;
        },
    );
    if (updated !== original) {
        await Deno.writeTextFile(path, updated);
    }
    return bumped;
}

console.log(`Setting Nimbus version to ${version}\n`);

for (const pkg of denoPackages) {
    const path = join(repoRoot, 'packages', pkg, 'deno.json');
    const changed = await updateDenoJson(path);
    console.log(
        `  ${changed ? 'bumped ' : 'skipped'} packages/${pkg}/deno.json`,
    );
}

console.log();

for (const example of npmExamples) {
    const path = join(repoRoot, 'examples', example, 'package.json');
    const bumped = await updateExamplePackageJson(path);
    if (bumped.length === 0) {
        console.log(`  skipped examples/${example}/package.json`);
    } else {
        console.log(
            `  bumped  examples/${example}/package.json (${bumped.length} dep${
                bumped.length === 1 ? '' : 's'
            })`,
        );
    }
}

console.log(`\nDone. Review with \`git diff\` before committing.`);
