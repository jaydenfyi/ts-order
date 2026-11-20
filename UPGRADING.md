# Upgrading to 0.1.0

1. **Compile your orders (optional, recommended).** One import compiles every order in an app and runs 1.3 to 2.4 times faster than 0.0.6.
2. **Check module loading.** 0.1.0 is ESM-only and requires Node.js 20+.
3. **Review sort behavior changes** in cases A through E below.

## 1. Compile your orders

In an application, add one import at the entry point:

```ts
import 'ts-order/compile';
```

In a library, compile each order instead so you do not affect the host application:

```ts
import { compile, Order } from 'ts-order';

const byStatusThenNewest = compile(
	Order.by((u: User) => u.status).by((u) => u.createdAt, {
		direction: 'desc',
	}),
);
```

Plain 0.1.0 orders run at about the same speed as 0.0.6, except `when()` is slower because it now adds a guard step. Compiled orders beat 0.0.6 in every case (Node 24, median of 9 runs, against 0.0.6 `order.sort()`):

| Order                                        |  Items | 0.1.0 `order.sort()` | 0.1.0 compiled `sort()` |
| -------------------------------------------- | -----: | -------------------: | ----------------------: |
| One number key                               |     10 |                1.08× |                   1.46× |
|                                              | 10,000 |                1.02× |                   1.27× |
| Three keys: number, date, string             |     10 |                1.07× |                   2.37× |
|                                              | 10,000 |                1.03× |                   2.13× |
| One computed key                             |     10 |                1.02× |                   1.74× |
|                                              | 10,000 |                1.00× |                   1.35× |
| A key, a `when()` of two steps, a tiebreaker |     10 |       0.85× (slower) |                   2.41× |
|                                              | 10,000 |       0.80× (slower) |                   1.87× |

Above 1× is faster than 0.0.6. See [Compiled orders](./README.md#compiled-orders) for caveats (module-level compilation, CSP fallback) and [BENCHMARKS.md](./BENCHMARKS.md) for library comparisons.

## 2. Check how you load ts-order

0.1.0 ships ESM only and drops the CommonJS build and `require` export conditions. Export names do not change. It also requires Node.js 20 or later.

No change needed for:

- ESM code or TypeScript that emits ESM.
- Bundlers (Vite, webpack, esbuild, Rollup).
- CommonJS on Node.js 20.19+, 22.12+, or 23+ (native `require()` of ESM, though some 22.x releases print `ExperimentalWarning`).

Action needed for:

- CommonJS on Node.js 20.0 to 20.18: `require('ts-order')` throws `ERR_REQUIRE_ESM`. Upgrade Node.js or use `await import('ts-order')`.
- Custom CommonJS loaders (such as Jest without ESM support): configure them to transform or import `ts-order`.

## 3. Check sort behavior changes

Sort results change only in cases A through E, where 0.0.x often depended on input order. Cases F and G cover runtime and loader support.

| Case | Condition                                                           | 0.0.x                                                   | 0.1.0                                                                                 |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A    | Key is `null`, `undefined`, `NaN`, or an invalid `Date`             | `null` sorted as 0. Others tied with every key.         | Nulls sort last in `asc` and `desc`. Pass `nulls: 'first'` to put them first.         |
| B    | `predicate` or `when()` passes for one item and fails for the other | Step skipped, so the failing item tied with every item. | The passing item comes first.                                                         |
| C    | `number` or `date` comparator receives `NaN` or an invalid date     | First                                                   | Last. Use `nansFirst(number)` for the old `number` order.                             |
| D    | Custom `compare` returns `NaN`                                      | "Less than" in both directions                          | Tie (`0`)                                                                             |
| E    | Key without `compare` has a plain object or `unknown` type          | Compiled, and all keys tied                             | Type error. Add a `compare` option.                                                   |
| F    | Node.js older than 20                                               | Supported                                               | Not supported                                                                         |
| G    | `require('ts-order')` on Node.js 20.0 to 20.18                      | CommonJS build                                          | `ERR_REQUIRE_ESM`. See [Check how you load ts-order](#2-check-how-you-load-ts-order). |

### Examples

```ts
// A. Nulls sort last
Order.by((x: { v?: number }) => x.v).sort([{ v: 3 }, {}, { v: 1 }]);
// 0.0.x: [{ v: 3 }, {}, { v: 1 }] (depended on input order)
// 0.1.0: [{ v: 1 }, { v: 3 }, {}]

// B. Passing predicate items come first
Order.by((u: User) => u.score, { predicate: (u) => u.score != null });
// 0.0.x: users without a score stayed in input order
// 0.1.0: users with a score first (by score), then users without one

// B. Same rule for the when comparator
const evenNumbersFirst = order<number>(
	when((value) => value % 2 === 0, number),
	number,
);
[3, 2, 1, 4].sort(evenNumbersFirst);
// 0.0.x: [1, 2, 3, 4]
// 0.1.0: [2, 4, 1, 3]

// C. NaN sorts last with number
[3, Number.NaN, 1].sort(number);
// 0.0.x: [NaN, 1, 3]
// 0.1.0: [1, 3, NaN]

// D. NaN comparator result is a tie
Order.by((x: number) => x, { compare: (a, b) => a - b }).compare(
	Infinity,
	Infinity,
);
// 0.0.x: -1 both ways
// 0.1.0: 0

// E. Object keys require compare
Order.by((c: Customer) => c.address); // 0.0.x: compiled, all keys tied. 0.1.0: type error
Order.by((c: Customer) => c.address, { compare: byCity }); // OK
```

Two edge notes:

- In `Order.when()`, items that pass the guard come first even when they fail a wrapped step's own predicate, matching the `when` comparator.
- `number(Infinity, Infinity)` returns `0` instead of `NaN`.

To audit your codebase, search for `by(`, `when(`, `predicate:`, `number`, and `date`. Check keys that can be null and predicates that can fail.

See [CHANGELOG.md](./CHANGELOG.md) for every change.
