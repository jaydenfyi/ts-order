---
'ts-order': patch
---

The `localeString` docs now say what it does: it calls `String.prototype.localeCompare` with the default locale. For a specific locale or options, the README shows how to pass one `Intl.Collator`'s `compare`. `date` now returns -1, 0 or 1, like `number`.
