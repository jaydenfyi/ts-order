---
'ts-order': patch
---

Make compiled `sort()` faster. It now sorts one entry object per item, which holds the item and its keys, instead of indexes into one key array per step. In the package benchmarks on Node 24 and Bun, it is up to 25% faster on shuffled arrays, and orders with several steps, predicates or `when()` gain the most. Single-key orders on arrays that are already sorted can be about 10% slower. Results do not change.
