# How to release a new version of the packages

We keep the version of all packages in sync.  
To release a new version of the packages, follow these steps:

## Create new Release on GitHub

```
# Run nx release on a clean main branch which should be released in dry-run to check the changes
nx release --skip-publish --dry-run

# Run nx release
nx release --skip-publish
```

## Publish to NPM

Make sure to login to NPM via command line before going on.

### First Release of a new package

To publish a new package to NPM for the first time you need to go the manual route.

```
cd dist/packages/<package-name>
npm publish . --access public --otp xxxxxx
```

### Subsequent Releases

For all other packages with subsequent releases, you can use the following command from the root.

```
nx release publish --otp=xxxxxx
```

## Publish to JSR

For each package make sure the version in the `dist/packages/<package-name>/jsr.json` matches the version in the `dist/packages/<package-name>/package.json` file.

Then run the `npx jsr publish` command from each packages dist folder to publish to JSR:

```
cd dist/packages/<package-name>
npx jsr publish
```
