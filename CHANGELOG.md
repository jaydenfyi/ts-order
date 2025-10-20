# ts-order

## 0.0.4

### Patch Changes

- Add TSDoc comments to Order class and methods + tweak docs

## 0.0.3

### Patch Changes

- Add typeVersions for correct module resolution in commonjs projects

## 0.0.2

### Patch Changes

- remove unnecessary Order constructor early return
- rely on `localeCompare` directly for the locale-aware string comparator instead of creating a new Intl.Collator isntance
- add `license` field in `package.json`
