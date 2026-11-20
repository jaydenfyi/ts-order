---
'ts-order': minor
---

**Breaking:** predicate steps now give one consistent order. When exactly one of two items passes a step's `predicate` (or a `when()` guard), the item that passes comes first, in both directions. When neither passes, the step is skipped as before. A `when()` guard is a step of its own, so items that pass it come first, even when they fail a wrapped step's predicate or the wrapped order is empty. This matches the `when` comparator.

Before, the step was skipped when either item failed. An item that failed then tied with every other item, so the result could depend on the input order, and a `when()` block followed by a tiebreaker could even form a cycle. This applies to `Order.by`, `Order.when` and the comparator `by` and `when`.

```ts
const byScore = Order.by((u: User) => u.score, {
	predicate: (u) => u.score != null,
});
// before: users without a score stayed where they were in the input
// after:  users with a score come first, then users without one
```
