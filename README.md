# 🔢 ts-order

A tiny ([879 B](https://bundlejs.com/?q=ts-order) minified and gzipped), type-safe sorting utility for JavaScript/TypeScript that gives you **declarative**, **composable**, and **immutable** multi-key ordering logic.

## Features

- Declarative key-based sorting
- Composable chaining with `.by()`, `.map()`, `.when()`
- Immutable API: methods return a new `Order`
- Type-safe with full inference
- Consistent results: missing keys and predicates follow fixed rules, so the output never depends on the input order
- DSU-optimized for costly key computations
- Optional compiled orders for faster sorting: `compile()` for one order, or `import 'ts-order/compile'` for every order
- Zero dependencies

## Installation

```bash
# npm
npm install ts-order

# yarn
yarn add ts-order

# pnpm
pnpm add ts-order

# bun
bun add ts-order
```

## Quickstart

```ts
import { Order } from 'ts-order';

interface User {
	id: number;
	isActive: boolean;
	firstName: string;
	lastName: string;
	age: number | null;
	createdAt: Date;
}

const users: User[] = [
	/* ... */
];

// Sort by isActive DESC, lastName ASC, then firstName ASC, then id ASC (tiebreaker)
const byActiveAndName = new Order<User>()
	.by((u) => u.isActive, { direction: 'desc' }) // active users first
	.by((u) => u.lastName)
	.by((u) => u.firstName)
	.by((u) => u.id); // tiebreaker stable sort on id

// Use order's optimized .sort() method
const sorted = byActiveAndName.sort(users);
// Or use the `compare` function directly with native Array.prototype.sort
const sorted2 = users.toSorted(byActiveAndName.compare);
```

## How ordering works

These rules apply to `Order` and to the comparator builders in `ts-order/comparator`.

- **Stable.** Items that tie on every step keep their input order. This is true for `order.sort()` and for `Array.prototype.sort` with `order.compare`.
- **Steps run in order.** The first step that tells two items apart decides. Later steps only break ties.
- **Default comparison.** Without a `compare` option, a step compares keys with `<` and `>`. The key must be `Comparable`: a `string`, `number`, `bigint`, `boolean`, `Date`, an object whose `valueOf()` returns a number or a bigint (such as a Luxon date), or a missing value. Use one kind of value per key. A key of type `string | number` can sort in an unexpected order.
- **Missing keys.** `null`, `undefined`, `NaN` and invalid dates are missing keys. They sort after all other keys, in both directions. They tie with each other, so the next step decides their order. The `nulls: 'first'` option puts them first. With a custom `compare` and no `nulls` option, your comparator receives missing keys unchanged.
- **Predicates.** For a step with a `predicate` (or inside a `when()` block): when both items pass, the step compares their keys. When only one passes, it comes first. When neither passes, the step skips them.
- **Direction.** `direction: 'desc'` reverses how keys compare. It does not move missing keys or the group of items that pass a predicate.
- **Comparator contract.** A `compare` option returns a negative number, 0 or a positive number, for keys in ascending order. A result of `NaN` counts as a tie, so a comparator should return `NaN` only for equal values. For example, `(a, b) => a - b` returns `NaN` for two equal infinities.
- **Key selectors.** `order.sort()` calls each key selector at most once per item per step. `order.compare` calls it each time it compares two items.

## API

### `class Order<T>`

#### `by(selector, options?)`

<details>
<summary>Signature</summary>

```ts
type KeyOptions<K, T> = {
	direction?: 'asc' | 'desc'; // default 'asc'
	compare?: Comparator<K>; // default: `<` and `>`
	predicate?: (value: T) => boolean;
	nulls?: 'first' | 'last'; // default 'last'
};

class Order<T> {
	// Without `compare`, the key must be Comparable.
	static by<T, K extends Comparable>(
		selector: (value: T) => K,
		options?: KeyOptions<K, T>,
	): Order<T>;
	static by<T, K>(
		selector: (value: T) => K,
		options: KeyOptions<K, T> & { compare: Comparator<K> },
	): Order<T>;
	// The instance `by` has the same two forms, without the `T` parameter.
	by<K extends Comparable>(
		selector: (value: T) => K,
		options?: KeyOptions<K, T>,
	): Order<T>;
	by<K>(
		selector: (value: T) => K,
		options: KeyOptions<K, T> & { compare: Comparator<K> },
	): Order<T>;
}
```

</details>

Create a new order with a single sort step. Defaults to an ascending direction and natural three-way comparison (i.e. `a < b`, `a > b`). Missing keys (`null`, `undefined`, `NaN` and invalid dates) sort last in both directions. Pass `nulls: 'first'` to put them first.

```ts
const byAgeAsc = Order.by((u: User) => u.age);
```

You can optionally provide a custom `compare` and `direction` property.
Note: The `compare` property expects a comparator that sorts in an ascending direction; the `direction` property will flip the compare result when set to `'desc'`.

```ts
import { collate } from 'ts-order/comparator';

const byNameDesc = Order.by((u: User) => u.lastName, {
	direction: 'desc',
	compare: collate('en'),
});

const byExpiryAsc = Order.by((i: Item) => i.expiresAt, {
	compare: (a, b) => a.getTime() - b.getTime(),
});

// Users without an age first, then youngest first.
const byAgeNullsFirst = Order.by((u: User) => u.age, { nulls: 'first' });
```

An object key needs a `compare` option, because `<` and `>` cannot order objects:

```ts
const byAddress = Order.by((c: Customer) => c.address, {
	compare: (a, b) => a.city.localeCompare(b.city),
});
```

You may also pass a `predicate`. Items that pass it come first, sorted by the step's key. Items that fail it come after, and the step skips them, so later steps decide their order.

```ts
// Users with an age first, youngest first. Users without an age last, by name.
const byAgeThenName = Order.by((u: User) => u.age, {
	predicate: (u) => u.age != null,
}).by((u) => u.lastName);
```

Every Order instance also exposes a chainable `.by()` method to append additional sort steps.

```ts
const byCreatedThenId = new Order<User>()
	.by((u) => u.createdAt)
	.by((u) => u.id);
```

#### `reverse(order)` and `reverse()`

<details>
<summary>Signature</summary>

```ts
class Order<T> {
	static reverse<T>(order: Order<T>): Order<T>;
	reverse(): Order<T>;
}
```

</details>

Flip all step directions. Missing keys and the items that pass a predicate stay where they are (see [How ordering works](#how-ordering-works)).

```ts
const newestFirst = Order.by((u: User) => u.createdAt).reverse();
```

#### `map(outer, order)`

<details>
<summary>Signature</summary>

```ts
class Order<T> {
	static map<T, K>(outer: (t: T) => K, sub: Order<K>): Order<T>;
	map<K>(outer: (t: T) => K, sub: Order<K>): Order<T>;
}
```

</details>

Lift an order defined for a nested value into the parent domain.

```ts
interface Address {
	city: string;
	postcode: string;
}
interface Customer {
	id: number;
	address: Address;
}

const byAddress = Order.by((a: Address) => a.city).by((a) => a.postcode);

const byCustomerAddress = Order.map((c: Customer) => c.address, byAddress);

// Or chain onto an existing order
const byIdThenAddress = new Order<Customer>()
	.by((c) => c.id)
	.map((c) => c.address, byAddress);
```

#### `when(predicate, order)`

<details>
<summary>Signature</summary>

```ts
class Order<T> {
	static when<T>(predicate: (value: T) => boolean, order: Order<T>): Order<T>;
	when(predicate: (value: T) => boolean, order: Order<T>): Order<T>;
}
```

</details>

Append the steps of another order, guarded by a predicate. Items that pass the guard come first, sorted by the wrapped order. Items that fail it skip the wrapped steps, so a later step decides their order. The `when` comparator follows the same rules.

```ts
const byRegion = new Order<User>()
	.by((u) => u.region)
	// EU region users get their own Order logic
	.when(
		(u) => u.region === 'eu',
		Order.by((u) => u.score, {
			direction: 'desc',
		}),
	)
	.by((u) => u.id); // tiebreak id sort for all users
```

#### `compare`

<details>
<summary>Signature</summary>

```ts
class Order<T> {
	get compare(): (a: T, b: T) => number;
}
```

</details>

Retrieve a native comparator compatible with `Array.prototype.sort`.

```ts
items.sort(Order.by((i: Item) => i.score, { direction: 'desc' }).compare);
```

#### `sort(array, order)` and `sort(array)`

<details>
<summary>Signature</summary>

```ts
class Order<T> {
	static sort<T, U extends T>(array: readonly U[], order: Order<T>): U[];
	sort<U extends T>(array: readonly U[]): U[];
}
```

</details>

Sort an array and return a **new** array. The input array does not change.

This method implements the [Schwartzian Transform](https://en.wikipedia.org/wiki/Schwartzian_transform) or DSU (decorate-sort-undecorate) technique, which ensures that each key selector is only invoked once per element per step. For larger arrays or costly key computations, this can yield significant performance improvements over repeatedly calling the selector during comparisons.

```ts
const out = Order.sort(users, byName);
// or
const out2 = byName.sort(users);
```

### Reusing orders across types

`Order<T>` is invariant in `T`. So an `Order<{ name: string }>` does not fit where an `Order<User>` is expected, even though every `User` has a `name`. To write an order once and use it for several types, make it a generic function:

```ts
const byName = <T extends { name: string }>() => Order.by((x: T) => x.name);

const byRoleThenName = new Order<Staff>([
	Order.by((s: Staff) => s.role),
	byName<Staff>(),
]);
const activeByName = Order.by((s: Staff) => s.team).when(
	(s) => s.isActive,
	byName(), // T is inferred
);
```

An identity `map` also works: `order.map((s) => s, byNameForAnyShape)`.

## Compiled orders

### `compile(order)`

<details>
<summary>Signature</summary>

```ts
function compile<T>(order: Order<T>): Order<T>;
```

</details>

Return an order with the same steps, whose `compare` and `sort` run code generated for those steps with `new Function`. The code is generated on the first use of each. In the [benchmarks](BENCHMARKS.md) it is 1.2 to 2.6 times faster: most for orders with several plain keys, least when a custom `compare` does most of the work.

```ts
import { compile, Order } from 'ts-order';

const byStatusThenNewest = compile(
	Order.by((u: User) => u.status).by((u) => u.createdAt, {
		direction: 'desc',
	}),
);

users.sort(byStatusThenNewest.compare);
byStatusThenNewest.sort(users);
```

- **Compile once.** The first compile in a process takes roughly 0.1 to 1 ms. Later compiles take about 5 µs once warm, but a plain order is still faster for small arrays, so compile an order at module level, not on every render or request.
- **Use `sort` for large arrays or costly keys.** `sort` computes each key once per item. `compare` computes keys on every comparison, so it is faster only for cheap keys on arrays of up to about 10,000 items.
- **Compile last.** Steps added to a compiled order with `.by()`, `.when()` or the other builder methods make a normal order.
- **No `new Function`, no problem.** Where it is blocked, such as under a Content Security Policy without `'unsafe-eval'`, on Cloudflare Workers or on edge runtimes, the compiled order uses the normal `compare` and `sort`. Results are the same either way. Only the step options are written into the generated code. Your selectors and comparators are passed to it as functions.
- **Only when used.** Bundlers drop the code generator from apps that import `Order` but not `compile`. `require('ts-order')` from CommonJS always loads it, which adds about 600 B.

### `import 'ts-order/compile'`

Compile every `Order` in an app with one import. Each order generates its code on the first use of its `compare` or its `sort`, as `compile()` does for one order. Results do not change.

```ts
// app entry point
import 'ts-order/compile';
```

- **For applications, not libraries.** It changes every `Order` in the app, including orders that your dependencies create.
- **Import it anywhere.** It also covers orders created before the import.
- **No need for `compile()`.** You can still call it; the results are the same.
- **Orders only.** It does not change the comparator functions from `ts-order/comparator`, such as `by()` and `order()`.
- **One copy of ts-order.** It changes the copy it imports. If an app loads ts-order from both ESM (`import`) and CommonJS (`require`), orders from the other copy are not compiled. Their results are the same; only the speed differs.
- **Blocked `new Function`.** It uses the normal `compare` and `sort`, and stops trying after the first failure. Under a Content Security Policy, that first attempt can send a violation report.
- **Bundle size.** Only apps that import it get the code generator: about 700 B gzipped. The main entry does not change.

---

## `ts-order/comparator` subpackage

The comparator subpackage offers a collection of standalone utilities you can use directly with native array sorting, or alongside `Order` when you need fine-grained control.

```ts
import {
	boolean,
	by,
	collate,
	compare,
	date,
	localeString,
	nansFirst,
	nansLast,
	nullsFirst,
	nullsLast,
	number,
	order,
	reverse,
	string,
	when,
} from 'ts-order/comparator';
```

### Comparators

#### `compare(a, b)`

<details>
<summary>Signature</summary>

```ts
function compare<T extends Comparable>(a: T, b: T): number;
```

</details>

Natural three-way comparator that relies on `<`/`>` checks. Missing values (`null`, `undefined`, `NaN` and invalid dates) sort last. Also exported as `string`.

```ts
['b', 'a', 'c'].sort(compare); // ['a', 'b', 'c']
[2, null, 1].sort(compare); // [1, 2, null]
```

#### `nullsFirst` and `nullsLast`

<details>
<summary>Signature</summary>

```ts
function nullsFirst<T>(
	compareFn: Comparator<T>,
): Comparator<T | null | undefined>;
function nullsLast<T>(
	compareFn: Comparator<T>,
): Comparator<T | null | undefined>;
```

</details>

Decorate a comparator to move `null`/`undefined` values to the beginning or end of the ordering.

```ts
scores.sort(nullsLast(number)); // [1, 2, null]
```

#### `nansFirst` and `nansLast`

<details>
<summary>Signature</summary>

```ts
function nansFirst<T>(compareFn: Comparator<T>): Comparator<T>;
function nansLast<T>(compareFn: Comparator<T>): Comparator<T>;
```

</details>

Handle `NaN` explicitly while delegating other values to the base comparator.

```ts
[Number.NaN, 2, 1].sort(nansLast(number)); // [1, 2, NaN]
```

#### `number`, `boolean`, `date`, `localeString`

<details>
<summary>Signature</summary>

```ts
function number(a: number, b: number): number;
function boolean(a: boolean, b: boolean): number;
function date(a: Date, b: Date): number;
function localeString(a: string, b: string): number;
```

</details>

Ready-to-use comparators for common primitives.

```ts
scores.sort(number); // numeric sort asc (NaN last)
names.sort(localeString); // String.prototype.localeCompare, default locale
flags.sort(boolean); // boolean sort asc (false first)
createdAt.sort(date); // chronological date sort asc (invalid dates last)
```

#### `collate(locales?, options?)`

<details>
<summary>Signature</summary>

```ts
function collate(
	locales?: string | string[],
	options?: Intl.CollatorOptions,
): Comparator<string>;
```

</details>

Build a string comparator from one `Intl.Collator`. `collate` creates the collator once, so the comparator is fast to call many times.

```ts
files.sort(collate(undefined, { numeric: true })); // ['file1', 'file2', 'file10']
```

### Comparator builders & combinators

These functions let you build, adapt, and compose comparators for flexible multi-key or conditional sorting. Similar to the `Order` class methods, but working directly on comparator functions instead of `Order` instances.

#### `by(key, options?)`

<details>
<summary>Signature</summary>

```ts
// Without `compare`, the key must be Comparable.
function by<T, K extends Comparable>(
	key: (value: T) => K,
	options?: KeyOptions<K, T>,
): Comparator<T>;
function by<T, K>(
	key: (value: T) => K,
	options: KeyOptions<K, T> & { compare: Comparator<K> },
): Comparator<T>;
```

</details>

Project values before comparing them. Accepts `direction`, `compare`, `predicate` and `nulls` just like `Order.by`, with the same rules.

```ts
items.sort(by((item) => item.label));
```

#### `order(...comparators)`

<details>
<summary>Signature</summary>

```ts
function order<T>(...comparators: Comparator<T>[]): Comparator<T>;
```

</details>

Chain comparators from most to least significant.

```ts
users.sort(
	order(
		by((u) => u.lastName),
		by((u) => u.firstName),
	),
);
```

#### `map(mapper, comparator?)`

<details>
<summary>Signature</summary>

```ts
// Without a comparator, the mapped value must be Comparable.
function map<T, U extends Comparable>(
	mapper: (value: T) => U,
	comparator?: Comparator<U>,
): Comparator<T>;
function map<T, U>(
	mapper: (value: T) => U,
	comparator: Comparator<U>,
): Comparator<T>;
```

</details>

Adapt a comparator to operate on mapped values.

```ts
// Sort items by their nested score property
items.sort(map((item) => item.nested.score));
```

#### `reverse(compareFn)`

<details>
<summary>Signature</summary>

```ts
function reverse<T>(compareFn: Comparator<T>): Comparator<T>;
```

</details>

Flip the direction of a comparator.

```ts
events.sort(reverse(date)); // most recent first
```

#### `when(predicate, comparator)`

<details>
<summary>Signature</summary>

```ts
function when<T>(
	predicate: (value: T) => boolean,
	comparator: Comparator<T>,
): Comparator<T>;
```

</details>

Put values that pass a guard first, sorted by the comparator. Values that fail the guard tie, so a later comparator decides their order.

```ts
const evenNumbersFirst = order<number>(
	when((value) => value % 2 === 0, number),
	number,
);
[3, 2, 1, 4].sort(evenNumbersFirst); // [2, 4, 1, 3]
```

### Constants

`A_BEFORE_B` (-1), `A_AFTER_B` (1) and `EQUAL` (0) name the results of a comparator, for comparators that read more clearly with words:

```ts
import { A_AFTER_B, A_BEFORE_B, EQUAL } from 'ts-order/comparator';

const shortFirst: Comparator<string> = (a, b) =>
	a.length < b.length ? A_BEFORE_B : a.length > b.length ? A_AFTER_B : EQUAL;
```

---

## Types

The main entry exports these types:

| Type                          | Meaning                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Comparator<T>`               | `(a: T, b: T) => number`, as used by `Array.prototype.sort`                                                                                                                    |
| `Direction`                   | `'asc' \| 'desc'`                                                                                                                                                              |
| `KeyOptions<K, T>`            | The options of `by`: `direction`, `compare`, `predicate` and `nulls`                                                                                                           |
| `KeyOptionsWithCompare<K, T>` | `KeyOptions` with a required `compare`, for a key of any type                                                                                                                  |
| `Comparable`                  | The key types the default comparison supports: `string`, `number`, `bigint`, `boolean`, `Date`, objects whose `valueOf()` returns a number or a bigint, `null` and `undefined` |

## Migrating from 0.0.x to 0.1.0

0.1.0 fixes several cases where the sort result depended on the input order. Each fix changes behaviour, so check the cases below.

**Predicates and `when()`.** When only one of two items passes, it now comes first. Before, the step was skipped, so the failing item tied with every other item. For example, the `evenNumbersFirst` comparator from the `when` docs returned `[1, 2, 3, 4]` for `[3, 2, 1, 4]`. It now returns `[2, 4, 1, 3]`. In `Order.when()`, items that pass the guard now come first even when they fail a wrapped step's own predicate, as with the `when` comparator.

```ts
const byScore = Order.by((u: User) => u.score, {
	predicate: (u) => u.score != null,
});
// before: users without a score stayed where they were in the input
// after:  users with a score first (by score), then users without one
```

**Missing keys.** `null`, `undefined`, `NaN` and invalid dates now sort last in both directions. Before, `undefined` and `NaN` tied with every key, and `null` sorted as 0. Use `nulls: 'first'` for the other end.

```ts
Order.by((x: { v?: number }) => x.v).sort([{ v: 3 }, {}, { v: 1 }]);
// before: [{ v: 3 }, {}, { v: 1 }] (depends on the input order)
// after:  [{ v: 1 }, { v: 3 }, {}]
```

**`number` and `date` comparators.** `NaN` and invalid dates now sort last instead of first. Wrap with `nansFirst(number)` for the old order of `number`.

```ts
[3, Number.NaN, 1].sort(number);
// before: [NaN, 1, 3]
// after:  [1, 3, NaN]
```

**`NaN` comparator results.** A `compare` option that returns `NaN` now counts as a tie. `number(Infinity, Infinity)` returns 0 instead of `NaN`.

```ts
const byValue = Order.by((x: number) => x, { compare: (a, b) => a - b });
byValue.compare(Infinity, Infinity);
// before: -1 both ways round, so a sort could put either item first
// after:  0
```

**Key types.** A key without a `compare` option must be `Comparable`. Object keys and `unknown` keys are now type errors, because they need a comparator.

```ts
Order.by((c: Customer) => c.address); // before: compiled, all keys tied. after: type error
Order.by((c: Customer) => c.address, { compare: byCity }); // OK
```

**Node.js.** The package now declares `engines.node >=20`.

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md) (or the [interactive report](BENCHMARKS.html)) for reproducible runtime and browser bundle-size comparisons against native sorting, Lodash, es-toolkit, fast-sort, Remeda, thenby, Effect and Radashi. The class-based, comparator, compiled-sort and compiled-compare APIs are measured separately. Compiled orders are prepared before timing; compilation cost and environments that block dynamic code generation are not represented by those steady-state timings. Effect Order / cached `Array.sortWith` and es-toolkit core / cached compatibility `orderBy` are also separate entries, so no library silently changes strategy between workloads.

[benchmarks/complex.md](benchmarks/complex.md) covers orderings that plain keys leave out: `when()` rules, custom ranks, missing values, locale collation, a reused nested order and a computed key. It compares ts-order code and timings with handwritten native comparators. Run it with `bun run bench:complex`.

```sh
bun run bench:check # validate fixtures, adapters and bundled examples
bun run bench      # shuffled inputs: 10, 100, 1k, 10k and 100k records
bun run bench:full # exhaustive run: same sizes, all four input shapes
```

The short run writes `BENCHMARKS.md`, interactive ranked charts in `BENCHMARKS.html`, and raw data in `benchmarks/results.json`. It shows observed winners, readable µs/ms units, and time relative to the fastest entry. Heatmap colours run from teal (best) to orange (worst) within each runtime or bundle-size chart; exact values and rankings remain visible. Code examples are available in the expandable section below the results. Expect roughly one to two minutes with the 100k-record cases. The exhaustive run is kept separately in `benchmarks/full.md`, `full.html` and `full.json`; it can take 10–15 minutes on a laptop. The retained exhaustive artifacts are historical pre-review results until that profile is rerun.

## License

MIT
