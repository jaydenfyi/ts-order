---
'ts-order': minor
---

Add a `"sideEffects"` field so bundlers can drop unused code. It lists only `ts-order/compile`, which must run for its effect; every other file is free of side effects. Also declare `"engines": { "node": ">=20" }`. Node versions older than 20 are no longer supported.
