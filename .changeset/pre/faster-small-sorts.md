---
'ts-order': patch
---

Change how `sort` compares keys, with no change in results. `sort` no longer allocates arrays on every call, and the default comparison checks for equal keys first. `sort` still calls each key selector at most once per item per step.

The speed compared with 0.0.6 depends on the order. In a Node benchmark:

- An order of 5 steps with many equal keys is 11–25% faster at 100 items or more, and 6% slower at 10 items.
- An order of 1 step with almost no equal keys is 9–15% slower.
- An order with string keys, a custom `compare` and a `when()` block is 38% slower at 10 items, 12% slower at 1,000 items, and the same speed at 100,000 items.

The checks for missing keys cause the slowdowns. In 0.0.6, `undefined` and `NaN` keys tied with every key, so the result could depend on the input order.
