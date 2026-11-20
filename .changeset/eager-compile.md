---
'ts-order': patch
---

Make `compile(order)` generate and cache both `compare` and `sort` before returning, without an initial sort call. The `ts-order/compile` side-effect import remains lazy. Unexpected code-generation errors now surface during `compile()` rather than first use; blocked code generation still falls back to plain ordering.
