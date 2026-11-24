---
'ts-order': patch
---

`sort()` calls a predicate that several steps share once per item, as compiled orders do. A `when()` guard and the steps it guards share one predicate, so orders with `when()` sort about 5 to 9% faster.
