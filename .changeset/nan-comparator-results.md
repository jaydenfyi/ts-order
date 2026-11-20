---
'ts-order': patch
---

A comparator result of `NaN` now counts as a tie. Before, `Order` read it as "less than" in both directions, so the sort result could depend on the input order. This happened with `(a, b) => a - b` on two equal infinities, and with the bundled `number` comparator. `number(Infinity, Infinity)` now returns 0, and the comparator `order(...)` moves on to the next comparator after a `NaN` result.
