# How to release a new version of the packages

For each package make sure the version in the `packages/<PACKAGE_NAME>/deno.json` is set correctly and stick to semantic versioning.

Once everything is ready make a new commit with a message if this type:

```
chore(<PACKAGE_NAME>): publish 0.0.0
```

Push to `main` and create a new release on GitHub.

## Publish to JSR

```
cd packages/<PACKAGE_NAME>
deno publish --allow-slow-types
```

**Slow Types**  
Because of some Zod inferred types, the `--allow-slow-types` flag is required to publish the package to JSR.
