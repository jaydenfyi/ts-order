---
'ts-order': minor
---

`by` accepts a direction in place of its options: `.by((u) => u.age, 'desc')` means `.by((u) => u.age, { direction: 'desc' })`. This works for `Order.by`, `order.by()` and the comparator `by`. An inline `compare` option now also type-checks when the selector's parameter is inferred, as in `new Order<Customer>().by((c) => c.address, { compare: (a, b) => … })`.
