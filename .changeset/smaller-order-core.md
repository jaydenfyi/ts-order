---
'ts-order': patch
---

Simplify the `Order` core. The main entry is 879 B minified and gzipped, against 867 B in 0.0.6. That is 12 B for the new rules for missing keys, predicates and `when()` guards. `order.compare` now returns the same function on every access.
