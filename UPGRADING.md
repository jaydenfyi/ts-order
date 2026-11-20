# Upgrading to 0.1.0

Most code needs no changes. 0.1.0 removes and renames no exports.

Sort results change only in the cases below. In most of them, 0.0.x gave a result that depended on the input order.

| If                                                                                      | 0.0.x                                                           | 0.1.0                                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A key is `null`, `undefined`, `NaN` or an invalid `Date`                                | `null` sorted as 0. The others tied with every key.             | Missing keys sort last, in `asc` and `desc`. Add `nulls: 'first'` to put them first. |
| A `predicate` or a `when()` guard passes for one item and fails for the other           | The step was skipped, so the failing item tied with every item. | The item that passes comes first.                                                    |
| You sort with the `number` or `date` comparator and a value is `NaN` or an invalid date | First                                                           | Last. Use `nansFirst(number)` for the old `number` order.                            |
| A key has no `compare` option and its type is a plain object or `unknown`               | It compiled, and all keys tied.                                 | Type error. Add a `compare` option.                                                  |
| A `compare` option returns `NaN`                                                        | "Less than" in both directions                                  | A tie                                                                                |
| You run Node.js older than 20                                                           | Supported                                                       | Not supported                                                                        |

## Examples

```ts
Order.by((x: { v?: number }) => x.v).sort([{ v: 3 }, {}, { v: 1 }]);
// 0.0.x: [{ v: 3 }, {}, { v: 1 }] (depends on the input order)
// 0.1.0: [{ v: 1 }, { v: 3 }, {}]

Order.by((u: User) => u.score, { predicate: (u) => u.score != null });
// 0.0.x: users without a score stay where they were in the input
// 0.1.0: users with a score first (by score), then users without one
```

## Find the code to check

Search your code for `by(`, `when(`, `predicate:` and the `number` and `date` comparators. Check each key that can be missing and each predicate that can fail. If the new order is what you want, you need no change.

## New and optional: compiled orders

The new `compile(order)` returns a faster order with the same results. To compile every order in an app, add `import 'ts-order/compile'` to its entry point. You do not need to change any code to upgrade. See [`compile(order)`](./README.md#compileorder) in the README.

See [CHANGELOG.md](./CHANGELOG.md) for every change.
