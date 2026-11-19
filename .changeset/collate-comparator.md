---
'ts-order': minor
---

Add `collate(locales?, options?)` to `ts-order/comparator`. It returns a string comparator from one `Intl.Collator`, created once when `collate` is called. For example, `collate(undefined, { numeric: true })` sorts "file2" before "file10".

The `localeString` docs now say what it does: it calls `String.prototype.localeCompare` with the default locale. `date` now returns -1, 0 or 1, like `number`.
