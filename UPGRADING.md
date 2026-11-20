# Upgrading to 0.1.0

To upgrade:

1. Compile your orders. This step is optional, but we recommend it. One import compiles every order in an app, and a compiled order is 1.3 to 2.4 times faster than 0.0.6.
2. Check how you load ts-order. 0.1.0 is ESM-only, but most projects need no change.
3. Check the cases where sort results change.

## 1. Compile your orders

In an application, add one import to the entry point:

```ts
import 'ts-order/compile';
```

Every `Order` in the app then runs code generated for its steps, including orders created before the import. You change no other code, and the sort results stay the same.

In a library, compile each order instead, so you do not change orders that belong to the app:

```ts
import { compile, Order } from 'ts-order';

const byStatusThenNewest = compile(
	Order.by((u: User) => u.status).by((u) => u.createdAt, {
		direction: 'desc',
	}),
);
```

### Why compile when you upgrade

A plain 0.1.0 order sorts at about the same speed as 0.0.6. An order with `when()` is slower: `when()` now adds a guard step, so the items that pass come first. A compiled order is faster than 0.0.6 in every case below, including `when()`.

Speed against `order.sort()` in 0.0.6, with the orders from the package benchmarks (Node 24, median of 9 runs):

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

Above 1× is faster than 0.0.6. See [BENCHMARKS.md](./BENCHMARKS.md) for comparisons with other libraries.

### What to know before you compile

- Compile an order once, at module level. Do not compile it on every render or request.
- Where `new Function` is blocked, such as under a strict Content Security Policy or on Cloudflare Workers, a compiled order uses the plain `compare` and `sort`. The results are the same, and only the speed differs.
- Prefer `order.sort(array)` to `array.sort(order.compare)` for large arrays or costly keys. `sort` computes each key once per item.

See [Compiled orders](./README.md#compiled-orders) in the README for the details.

## 2. Check how you load ts-order

0.1.0 publishes only ES modules. It removes the CommonJS build and the `require` export conditions. The exports keep their names.

Most projects need no change:

- ESM code, and TypeScript that emits ESM: no change.
- Apps built with a bundler, such as Vite, webpack, esbuild or Rollup: no change. The bundler loads the ESM build.
- CommonJS code on Node.js 20.19 or later, 22.12 or later, or 23 and later: no change. These versions can `require()` an ES module, so `require('ts-order')` still works. Some 22.x versions print an `ExperimentalWarning`.

Some projects need a change:

- CommonJS code on Node.js 20.0 to 20.18: `require('ts-order')` fails with `ERR_REQUIRE_ESM`. Upgrade Node.js, or load ts-order with `await import('ts-order')`.
- Tools that load CommonJS with their own module system, such as Jest without ESM support, can fail on ESM in `node_modules`. Configure the tool to transform or import ts-order.

0.1.0 also needs Node.js 20 or later.

## 3. Check the sort results that change

Sort results change only in cases A to E below. In most of them, 0.0.x gave a result that depended on the input order. Cases F and G change which Node.js versions and loaders work.

| Case | If                                                                                      | 0.0.x                                                           | 0.1.0                                                                                 |
| ---- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A    | A key is `null`, `undefined`, `NaN` or an invalid `Date`                                | `null` sorted as 0. The others tied with every key.             | Missing keys sort last, in `asc` and `desc`. Add `nulls: 'first'` to put them first.  |
| B    | A `predicate` or a `when()` guard passes for one item and fails for the other           | The step was skipped, so the failing item tied with every item. | The item that passes comes first.                                                     |
| C    | You sort with the `number` or `date` comparator and a value is `NaN` or an invalid date | First                                                           | Last. Use `nansFirst(number)` for the old `number` order.                             |
| D    | A `compare` option returns `NaN`                                                        | "Less than" in both directions                                  | A tie                                                                                 |
| E    | A key has no `compare` option and its type is a plain object or `unknown`               | It compiled, and all keys tied.                                 | Type error. Add a `compare` option.                                                   |
| F    | You run Node.js older than 20                                                           | Supported                                                       | Not supported                                                                         |
| G    | You load `ts-order` with `require()` on Node.js 20.0 to 20.18                           | CommonJS build                                                  | `ERR_REQUIRE_ESM`. See [Check how you load ts-order](#2-check-how-you-load-ts-order). |

## Examples

Each example starts with the letter of its case. F and G have no example.

```ts
// A. Missing keys sort last
Order.by((x: { v?: number }) => x.v).sort([{ v: 3 }, {}, { v: 1 }]);
// 0.0.x: [{ v: 3 }, {}, { v: 1 }] (depends on the input order)
// 0.1.0: [{ v: 1 }, { v: 3 }, {}]

// B. The item that passes a predicate comes first
Order.by((u: User) => u.score, { predicate: (u) => u.score != null });
// 0.0.x: users without a score stay where they were in the input
// 0.1.0: users with a score first (by score), then users without one

// B. The same rule for the when comparator
const evenNumbersFirst = order<number>(
	when((value) => value % 2 === 0, number),
	number,
);
[3, 2, 1, 4].sort(evenNumbersFirst);
// 0.0.x: [1, 2, 3, 4]
// 0.1.0: [2, 4, 1, 3]

// C. NaN sorts last with the number comparator
[3, Number.NaN, 1].sort(number);
// 0.0.x: [NaN, 1, 3]
// 0.1.0: [1, 3, NaN]

// D. A NaN comparator result is a tie
Order.by((x: number) => x, { compare: (a, b) => a - b }).compare(
	Infinity,
	Infinity,
);
// 0.0.x: -1 both ways round, so a sort could put either item first
// 0.1.0: 0

// E. An object key needs a compare option
Order.by((c: Customer) => c.address); // 0.0.x: compiled, all keys tied. 0.1.0: type error
Order.by((c: Customer) => c.address, { compare: byCity }); // OK
```

More detail on two cases:

- B: In `Order.when()`, items that pass the guard come first even when they fail a wrapped step's own predicate, as with the `when` comparator.
- C and D: `number(Infinity, Infinity)` returns 0 instead of `NaN`.

## Find the code to check

Search your code for `by(`, `when(`, `predicate:` and the `number` and `date` comparators. Check each key that can be missing and each predicate that can fail. If the new order is what you want, you need no change.

See [CHANGELOG.md](./CHANGELOG.md) for every change.
