---
'ts-order': patch
---

Make `sort` faster for small arrays: it no longer allocates typed arrays on every call. On Node, sorting 10 items with the 6-step benchmark order takes 1.6 µs instead of 2.0 µs, about as fast as `array.slice().sort(order.compare)`. Sorting 2 items takes 0.37 µs instead of 0.76 µs. Larger arrays are unchanged. `sort` still calls each key selector at most once per item per step.
