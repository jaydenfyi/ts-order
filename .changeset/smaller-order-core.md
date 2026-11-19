---
'ts-order': patch
---

Make the `Order` core smaller. The main entry is 860 B minified and gzipped, against 867 B in 0.0.6, even with the new rules for missing keys and predicates. `order.compare` now returns the same function on every access.
