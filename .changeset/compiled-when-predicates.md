---
'ts-order': patch
---

`compile(order).sort()` calls a `when()` predicate once per item, not once per step that the `when()` adds. Steps that share one predicate function, such as the steps of a `when()`, now reuse its result. For an order with a `when()` of two steps, `sort()` was 1.2 to 1.6 times faster in Node and Bun. The sorted result does not change. `compare` and orders without `compile` are not changed.
