---
'ts-order': patch
---

Make the `Order` core smaller (867 B to 750 B minified and gzipped) with no change in behaviour or speed. `order.compare` now returns the same function on every access.
