# ts-order

## 0.1.0-alpha.0

### Minor Changes

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`e965d3f`](https://github.com/jaydenfyi/ts-order/commit/e965d3f88647c4594ae3050ee8c68ae0d5ef5c67) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Add the `ts-order/compile` entry. `import 'ts-order/compile'` makes every `Order` run generated code, as `compile()` does, including orders created before the import. Each order generates the code for its `compare` and its `sort` on the first use of each. Results do not change, and `compile()` still works with it. Where `new Function` is blocked, orders use the normal `compare` and `sort`. Only apps that import it get the code generator, about 700 B gzipped.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`ab2fb7e`](https://github.com/jaydenfyi/ts-order/commit/ab2fb7e7d97dbb254ceb02ad8bc4db8f7cb10a2e) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - **Breaking (types only):** a key with no `compare` option must now be `Comparable`: `string`, `number`, `bigint`, `boolean`, `Date`, an object whose `valueOf()` returns a number or a bigint (such as a Luxon, dayjs or moment date), `null` or `undefined`. Any other object key without `compare` is now a type error, because `<` and `>` compare objects as the text `"[object Object]"`, so all object keys tied. Keys typed `unknown` also need a `compare` option or a narrower type. This applies to `Order.by`, the comparator `by` and `map`, and the exported `compare`.

    `KeyOptions` now accepts explicit `undefined` values, such as `{ direction: undefined }`, under `exactOptionalPropertyTypes`. The `Comparable` and `KeyOptionsWithCompare` types are exported from the main entry.

    ```ts
    Order.by((user: User) => user.address); // now a type error
    Order.by((user: User) => user.address, { compare: byCity }); // OK
    ```

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`e965d3f`](https://github.com/jaydenfyi/ts-order/commit/e965d3f88647c4594ae3050ee8c68ae0d5ef5c67) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Add `compile(order)`. It returns an order with the same steps, whose `compare` and `sort` run code generated for those steps with `new Function`. `compile()` generates both before it returns, so compile an order once and reuse it. The compiled `sort` calls each key selector once per item per step, and a `when()` predicate once per item. Results are the same as the plain order. On 1,000 shuffled records in BENCHMARKS.md, `compile(order).sort()` made 1.6 to 2.2 times as many sorts per second as `order.sort()`, most for the order with three keys. Where `new Function` is blocked, such as under a strict Content Security Policy, on Cloudflare Workers or on edge runtimes, the compiled order uses the normal `compare` and `sort`. Bundlers drop the code generator from apps that import `Order` but not `compile`, so they still get 879 B gzipped. `compile()` adds about 700 B.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`a650dcd`](https://github.com/jaydenfyi/ts-order/commit/a650dcd9eecf2142e852cf9278f8a4851a53fdcf) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Publish ESM only. The CommonJS build and the `require` export conditions are removed. ESM code and bundled apps need no change. CommonJS code can still `require('ts-order')` on Node.js 20.19 or later, 22.12 or later, or 23 and later. On Node.js 20.0 to 20.18, `require` fails with `ERR_REQUIRE_ESM`, so use `await import('ts-order')` or upgrade Node.js.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`71b891b`](https://github.com/jaydenfyi/ts-order/commit/71b891b020c774b704c9acc4bfa3f7ef27986143) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - **Breaking:** missing keys now sort to a fixed position. A missing key is `null`, `undefined`, `NaN` or an invalid `Date`. By default, missing keys sort after all other keys, in both `asc` and `desc`. The new `nulls: 'first' | 'last'` option on `by` changes this.

    Before, the default comparison used only `<` and `>`. An `undefined` or `NaN` key then tied with every other key, so the result depended on the input order, and a `null` key sorted as if it were 0.

    With a custom `compare` and no `nulls` option, the comparator still receives missing keys unchanged.

    The comparator module follows the same rule. The exported `compare` (and `string`) sorts missing values last. `number` and `date` now put `NaN` and invalid dates last instead of first.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`7258f73`](https://github.com/jaydenfyi/ts-order/commit/7258f73b71e5ef0ad4e6e98b9efc66cc4e7057ae) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Add a `"sideEffects"` field so bundlers can drop unused code. It lists only `ts-order/compile`, which must run for its effect; every other file is free of side effects. Also declare `"engines": { "node": ">=20" }`. Node versions older than 20 are no longer supported.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`841f028`](https://github.com/jaydenfyi/ts-order/commit/841f028bb607073aa30dde93004652b8453f8f89) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - **Breaking:** predicate steps now give one consistent order. When exactly one of two items passes a step's `predicate` (or a `when()` guard), the item that passes comes first, in both directions. When neither passes, the step is skipped as before. A `when()` guard is a step of its own, so items that pass it come first, even when they fail a wrapped step's predicate or the wrapped order is empty. This matches the `when` comparator.

    Before, the step was skipped when either item failed. An item that failed then tied with every other item, so the result could depend on the input order, and a `when()` block followed by a tiebreaker could even form a cycle. This applies to `Order.by`, `Order.when` and the comparator `by` and `when`.

    ```ts
    const byScore = Order.by((u: User) => u.score, {
    	predicate: (u) => u.score != null,
    });
    // before: users without a score stayed where they were in the input
    // after:  users with a score come first, then users without one
    ```

### Patch Changes

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`63c475f`](https://github.com/jaydenfyi/ts-order/commit/63c475fbc9642179a02fc332df5c4f968b5277d4) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - The `localeString` docs now say what it does: it calls `String.prototype.localeCompare` with the default locale. For a specific locale or options, the README shows how to pass one `Intl.Collator`'s `compare`. `date` now returns -1, 0 or 1, like `number`.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`2e7fb2f`](https://github.com/jaydenfyi/ts-order/commit/2e7fb2f77c6e92d3bbd548f609bf3dfd7f6c3b7d) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Make the comparator module faster. `compare`, and the helper behind `by`, `nullsFirst`, `nullsLast`, `nansFirst` and `nansLast`, now return 0 at once for two equal values (`a === b`). The comparator `by` also checks each key for a missing value at most twice per comparison, not up to 5 times. Compared with 0.0.6 on Node, `compare` on numbers is about 14% faster, and `by` on keys with many ties is about 12% faster. The `ts-order/comparator` entry is 625 B gzipped, against 655 B in 0.0.6.

    A comparator that you pass to `by` with a `nulls` option, or to `nullsFirst`, `nullsLast`, `nansFirst` or `nansLast`, is no longer called for two equal values. A correct comparator returns 0 for them, so its results do not change. A comparator that never returns 0, such as `(a, b) => (a < b ? -1 : 1)`, now gives a tie for equal values, so the next comparator decides their order.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`5ccd278`](https://github.com/jaydenfyi/ts-order/commit/5ccd278c94c5088b0621a87a5104ff4eb1b7b679) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Change how `sort` compares keys, with no change in results. `sort` no longer allocates arrays on every call, and the default comparison checks for equal keys first. `sort` still calls each key selector at most once per item per step.

    The speed compared with 0.0.6 depends on the order. In a Node benchmark:

    - An order of 5 steps with many equal keys is 11–25% faster at 100 items or more, and 6% slower at 10 items.
    - An order of 1 step with almost no equal keys is 9–15% slower.
    - An order with string keys, a custom `compare` and a `when()` block is 38% slower at 10 items, 12% slower at 1,000 items, and the same speed at 100,000 items.

    The checks for missing keys cause the slowdowns. In 0.0.6, `undefined` and `NaN` keys tied with every key, so the result could depend on the input order.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`fb2b339`](https://github.com/jaydenfyi/ts-order/commit/fb2b339ef67b1a7ae80cb8f7c08e6266852d50fa) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - A comparator result of `NaN` now counts as a tie. Before, `Order` read it as "less than" in both directions, so the sort result could depend on the input order. This happened with `(a, b) => a - b` on two equal infinities, and with the bundled `number` comparator. `number(Infinity, Infinity)` now returns 0, and the comparator `order(...)` moves on to the next comparator after a `NaN` result.

- [#1](https://github.com/jaydenfyi/ts-order/pull/1) [`738b60d`](https://github.com/jaydenfyi/ts-order/commit/738b60d0e4f8a6edc91767c1b6e4acc7cde99488) Thanks [@jaydenfyi](https://github.com/jaydenfyi)! - Simplify the `Order` core. The main entry is 879 B minified and gzipped, against 867 B in 0.0.6. That is 12 B for the new rules for missing keys, predicates and `when()` guards. `order.compare` now returns the same function on every access.

## 0.0.6

### Patch Changes

- Preserve the input array element type when sorting with an `Order` for a wider base type.
- reuse `Comparator` type

## 0.0.5

### Patch Changes

- Simplify README.md
- 5a71186: README and TSDoc comment tweaks

## 0.0.4

### Patch Changes

- Add TSDoc comments to Order class and methods + tweak docs

## 0.0.3

### Patch Changes

- Add typeVersions for correct module resolution in commonjs projects

## 0.0.2

### Patch Changes

- remove unnecessary Order constructor early return
- rely on `localeCompare` directly for the locale-aware string comparator instead of creating a new Intl.Collator isntance
- add `license` field in `package.json`
