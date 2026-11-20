# 🔢 ts-order

A tiny ([under 1 kB](https://bundlejs.com/?q=ts-order) minified and gzipped), type-safe sorting utility for JavaScript/TypeScript that gives you **declarative**, **composable**, and **immutable** multi-key ordering logic.

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

ts-order is ESM-only and needs Node.js 20 or later. Bundlers and ESM code load it directly. CommonJS code can `require('ts-order')` on Node.js 20.19 or later, 22.12 or later, or 23 and later. On older versions, use `await import('ts-order')`.

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

const users: User[] = [/* ... */];

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

Pass `compare` for a custom comparison and `direction: 'desc'` to reverse the step. `compare` must sort in ascending order, and `direction` flips its result.

```ts
const collator = new Intl.Collator('en');

const byNameDesc = Order.by((u: User) => u.lastName, {
	direction: 'desc',
	compare: collator.compare,
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

The instance method `.by()` appends a step to an existing order.

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

`sort` uses the [Schwartzian transform](https://en.wikipedia.org/wiki/Schwartzian_transform), also called decorate-sort-undecorate (DSU). It calls each key selector once per item per step and then sorts the stored keys. `compare` calls the selector on every comparison, so `sort` can be much faster for large arrays and costly keys.

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

Return an order with the same steps, whose `compare` and `sort` run code generated for those steps with `new Function`. The code is generated on the first use of each. It is faster in the [benchmarks](BENCHMARKS.md), most for orders with several plain keys and least when a custom `compare` does most of the work.

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

<details>
<summary>What the generated code looks like</summary>

A plain order's `compare` loops over its steps and reads each step's options on every comparison:

```js
(a, b) => {
	for (const step of steps) {
		// (predicate check, when the step has one)
		const r = compareKeys(step, step.key(a), step.key(b)); // reads step.direction, step.nulls, step.compare
		if (r) return r;
	}
	return 0;
};
```

`compile()` writes the same steps out as straight-line code. For `byStatusThenNewest`, the generated `compare` is equivalent to this (formatted and renamed for reading):

```js
// statusKey and createdAtKey are your two selectors, passed in as functions.
// isMissing tests for null, undefined, NaN and invalid dates.
function compare(a, b) {
	let x;
	let y;
	let missing;

	// Step 1: status, ascending, missing keys last
	x = statusKey(a);
	y = statusKey(b);
	if (x !== y) {
		if (x !== null && y !== null) {
			if (x < y) return -1;
			if (x > y) return 1;
		}
		missing = isMissing(x);
		if (missing !== isMissing(y)) return missing ? 1 : -1;
	}

	// Step 2: createdAt, descending: the signs are swapped in the code
	x = createdAtKey(a);
	y = createdAtKey(b);
	if (x !== y) {
		if (x !== null && y !== null) {
			if (x < y) return 1;
			if (x > y) return -1;
		}
		missing = isMissing(x);
		if (missing !== isMissing(y)) return missing ? 1 : -1;
	}

	return 0;
}
```

The loop and the option lookups are gone. Each direction and `nulls` setting is a constant, and a step without a predicate or a custom `compare` has no code for one. The generated `sort` uses the same comparison code on keys that it computes once per item.

</details>

- **Compile once.** The first compile in a process takes roughly 0.1 to 1 ms. Later compiles take about 5 µs, which is still slower than sorting a small array with a plain order. Compile an order at module level, not on every render or request.
- **Use `sort` for large arrays or costly keys.** `sort` computes each key once per item. `compare` computes keys on every comparison, so it is faster only for cheap keys on arrays of up to about 10,000 items.
- **Compile last.** Steps added to a compiled order with `.by()`, `.when()` or the other builder methods make a normal order.
- **Blocked `new Function`.** Where `new Function` is blocked, such as under a Content Security Policy without `'unsafe-eval'`, on Cloudflare Workers or on edge runtimes, the compiled order uses the normal `compare` and `sort`. Results are the same either way. The generated code contains only the step options. `compile` passes your selectors and comparators to it as functions.
- **Only when used.** Bundlers drop the code generator from apps that import `Order` but not `compile`.

### `import 'ts-order/compile'`

Compile every `Order` in an app with one import. Each order generates its code on the first use of its `compare` or its `sort`, as `compile()` does for one order. Results do not change.

```ts
// app entry point
import 'ts-order/compile';
```

- **For applications, not libraries.** It changes every `Order` in the app, including orders that your dependencies create.
- **Import it anywhere.** It also covers orders created before the import.
- **No need for `compile()`.** You can still call it, and the results are the same.
- **Orders only.** It does not change the comparator functions from `ts-order/comparator`, such as `by()` and `order()`.
- **One copy of ts-order.** It changes the copy it imports. If an app bundles a second copy of ts-order, orders from that copy are not compiled. Their results are the same, and only the speed differs.
- **Blocked `new Function`.** It uses the normal `compare` and `sort`, and stops trying after the first failure. Under a Content Security Policy, that first attempt can send a violation report.
- **Bundle size.** Only apps that import it get the code generator. The main entry stays the same size.

---

## `ts-order/comparator` subpackage

`ts-order/comparator` exports standalone comparators and comparator builders. Use them with `Array.prototype.sort`, or as the `compare` option of an `Order` step.

```ts
import {
	boolean,
	by,
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

#### Locale-aware strings with options

For a specific locale or options such as `numeric: true`, create one `Intl.Collator` and pass its `compare` function. `compare` is already bound to its collator, so it works on its own.

```ts
const collator = new Intl.Collator('en', { numeric: true });

files.sort(collator.compare); // ['file1', 'file2', 'file10']
```

Create the collator once, outside the comparator. `a.localeCompare(b, 'en', { numeric: true })` builds a new collator on every call, which makes a large sort many times slower.

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

## Upgrading

[UPGRADING.md](UPGRADING.md) lists the changes that affect sort results between versions. [CHANGELOG.md](CHANGELOG.md) lists every change.

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md) (or the [interactive report](BENCHMARKS.html)) for runtime and browser bundle-size comparisons with native sorting, Lodash, es-toolkit, fast-sort, Remeda, thenby, Effect and Radashi. The report times the class API, the comparator API, compiled `sort` and compiled `compare` separately. It compiles orders before timing, so the timings leave out compile cost and do not cover environments that block `new Function`.

[benchmarks/complex.md](benchmarks/complex.md) covers orderings that plain keys leave out: `when()` rules, custom ranks, missing values, locale collation, a reused nested order and a computed key. It compares ts-order code and timings with handwritten native comparators. Run it with `bun run bench:complex`.

```sh
bun run bench:check # validate fixtures, adapters and bundled examples
bun run bench      # shuffled inputs: 10, 100, 1k, 10k and 100k records
bun run bench:full # exhaustive run: same sizes, all four input shapes
```

`bun run bench` writes `BENCHMARKS.md`, interactive charts in `BENCHMARKS.html` and raw data in `benchmarks/results.json`. It takes about one to two minutes. `bun run bench:full` writes `benchmarks/full.md`, `full.html` and `full.json`, and can take 10 to 15 minutes on a laptop.

## License

MIT
