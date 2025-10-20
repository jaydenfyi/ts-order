# ts-order

## 0.0.2

### Patch Changes

- - remove unnecessary Order constructor early return
  - rely on `localeCompare` directly for the locale-aware string comparator instead of creating a new Intl.Collator isntance
  - add `license` field in `package.json`
