# 🔢 ts-order

A [fast](BENCHMARKS.md), type-safe sorting utility for JavaScript/TypeScript that gives you **declarative**, **composable**, and **immutable** multi-key ordering logic.

## Features

- Declarative key-based sorting
- Composable chaining with `.by()`, `.map()`, `.when()`
- Immutable API: methods return a new `Order`
- Type-safe with full inference
- Consistent results: nulls and predicates follow fixed rules, so the output never depends on the input order
- DSU-optimized for costly key computations
- Optional compiled orders for faster sorting: `compile()` for one order, or `import 'ts-order/compile'` for every order
- Standalone comparator helpers in `ts-order/comparator` for `Array.prototype.sort`
- Zero dependencies

## Installation

```bash
npm install ts-order
```

ts-order is ESM-only and requires Node.js 20 or later.

## Quickstart

```ts
import { Order } from 'ts-order';
// Compile every Order to optimized code for faster sorting (optional)
import 'ts-order/compile';

interface User {
	id: number;
	isActive: boolean;
	firstName: string;
	lastName: string;
	age: number | null;
	createdAt: Date;
}

const users: User[] = [/* ... */];

// Active users first, then lastName, firstName, and id as tiebreaker
const byActiveAndName = new Order<User>()
	.by((u) => u.isActive, { direction: 'desc' })
	.by((u) => u.lastName)
	.by((u) => u.firstName)
	.by((u) => u.id);

// Returns a new sorted array (computes each key once per item)
const sorted = byActiveAndName.sort(users);

// Or pass .compare to Array.prototype.sort / toSorted
const sorted2 = users.toSorted(byActiveAndName.compare);
```

## Sorting rules

These rules apply to `Order` and the comparator builders in `ts-order/comparator`.

- `null`, `undefined`, `NaN`, and invalid dates count as nulls. They sort last in both directions and tie with each other, so later steps decide their order. Pass `nulls: 'first'` to put them first. A custom `compare` with no `nulls` option receives nulls unchanged.
- `direction: 'desc'` reverses key comparisons. It does not move nulls or predicate matches.
- Default comparison (`<` and `>`) accepts strings, numbers, bigints, booleans, `Date`, or objects whose `valueOf()` returns a number or bigint (such as Luxon dates). Use one value type per key, because mixed types like `string | number` sort unpredictably.
- A custom `compare` that returns `NaN` counts as a tie (for example, `(a, b) => a - b`, because `Infinity - Infinity` is `NaN`).

## API

### `Order<T>`

Every builder method returns a new `Order<T>`. `by`, `reverse`, `map`, `when`, and `sort` work as both static methods (`Order.by(...)`) and instance methods (`order.by(...)`).

#### `by(selector, options?)`

```ts
by<K extends Comparable>(selector: (value: T) => K, options?: KeyOptions<K, T>): Order<T>
by<K>(selector: (value: T) => K, options: KeyOptions<K, T> & { compare: Comparator<K> }): Order<T>
```

Adds a sort step. Without options, it sorts ascending with `<` and `>`. Object keys require a `compare` option.

| Option      | Default     | Behavior                                                                                                |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `direction` | `'asc'`     | `'desc'` reverses the step.                                                                             |
| `compare`   | `<` and `>` | Custom ascending comparator for the key. `direction` flips its result.                                  |
| `nulls`     | `'last'`    | Where [nulls](#sorting-rules) go in both directions.                                                    |
| `predicate` | none        | Items that pass sort first by this key. Items that fail come after, and later steps decide their order. |

```ts
const collator = new Intl.Collator('en');

const byNameAndAge = new Order<User>()
	.by((u) => u.lastName, { direction: 'desc', compare: collator.compare })
	.by((u) => u.age, { nulls: 'first' });

// Object keys need a custom compare
const byAddress = Order.by((c: Customer) => c.address, {
	compare: (a, b) => a.city.localeCompare(b.city),
});

// Predicate: users with an age first (youngest first), then the rest by name
const byAgeThenName = new Order<User>()
	.by((u) => u.age, { predicate: (u) => u.age != null })
	.by((u) => u.lastName);
```

#### `reverse()`

```ts
reverse(): Order<T>
```

Flips the direction of every step. Nulls and predicate matches keep their place.

```ts
const newestFirst = Order.by((u: User) => u.createdAt)
	.reverse();
```

#### `map(outer, subOrder)`

```ts
map<K>(outer: (value: T) => K, subOrder: Order<K>): Order<T>
```

Applies an `Order<K>` to a nested value extracted by `outer`.

```ts
const byAddress = Order.by((a: Address) => a.city)
	.by((a) => a.postcode);

const byIdThenAddress = new Order<Customer>()
	.by((c) => c.id)
	.map((c) => c.address, byAddress);
```

#### `when(predicate, subOrder)`

```ts
when(predicate: (value: T) => boolean, subOrder: Order<T>): Order<T>
```

Guards the steps of `subOrder`. Items that pass `predicate` come first and sort by `subOrder`. Items that fail skip those steps, and later steps decide their order.

```ts
const byRegion = new Order<User>()
	.by((u) => u.region)
	.when(
		(u) => u.region === "eu",
		Order.by((u) => u.score, { direction: "desc" }),
	)
	.by((u) => u.id);
```

#### `compare`

```ts
get compare(): (a: T, b: T) => number
```

Returns a comparator for `Array.prototype.sort` or `toSorted`.

#### `sort(array)`

```ts
sort<U extends T>(array: readonly U[]): U[]
```

Returns a new sorted array without mutating the input. `sort()` calls each selector at most once per item (decorate-sort-undecorate), while `compare` runs selectors on every comparison. Use `sort()` for large arrays or costly keys.

<details>
<summary>Reusing an order across types</summary>

`Order<T>` is invariant in `T`, so `Order<{ name: string }>` does not match `Order<User>`. Wrap reusable orders in a generic function, or use an identity `map((x) => x, byName)`:

```ts
const byName = <T extends { name: string }>() => Order.by((x: T) => x.name);

const activeByName = Order.by((s: Staff) => s.team)
	.when((s) => s.isActive, byName());
```

</details>

## Compiled orders

### `compile(order)`

```ts
function compile<T>(order: Order<T>): Order<T>;
```

Immediately generates and caches straight-line code for both `compare` and `sort` with `new Function`, so there is no step loop or option lookup. No initial `.sort()` call is needed. Plain multi-key orders gain the most (see [BENCHMARKS.md](BENCHMARKS.md)).

```ts
import { compile, Order } from "ts-order";

const byStatusThenNewest = compile(
	Order.by((u: User) => u.status)
		.by((u) => u.createdAt, { direction: "desc" }),
);

users.sort(byStatusThenNewest.compare);
byStatusThenNewest.sort(users);
```

<details>
<summary>What the generated code looks like</summary>

A plain order loops over its steps and reads each step's options on every comparison:

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

`compile()` unrolls those steps into straight-line code. For `byStatusThenNewest`, the generated `compare` matches this (formatted and renamed):

```js
// statusKey and createdAtKey are your two selectors, passed in as functions.
// isMissing tests for null, undefined, NaN and invalid dates.
function compare(a, b) {
	let x;
	let y;
	let missing;

	// Step 1: status, ascending, nulls last
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

Each direction and `nulls` setting becomes a constant, and unused predicates or custom comparators emit no code. Generated `sort` runs the same checks on keys computed once per item.

</details>

- Compile once at module level, not per render or request. First compile takes ~0.1 to 1 ms, and later compiles take ~5 µs.
- Compile last. Chaining `.by()`, `.when()`, or other methods onto a compiled order returns a plain order.
- When an environment blocks `new Function` (strict CSP, Cloudflare Workers), compiled orders fall back to plain `compare` and `sort` with the same results.
- Generated source contains only step options. Your selectors and comparators pass in as function arguments.
- The code generator adds about 0.7 kB minified and gzipped: `Order` alone is under 0.9 kB, and with `compile()` it is about 1.6 kB. Bundlers tree-shake the generator out unless you import `compile` or `ts-order/compile`.

### `import 'ts-order/compile'`

Compiles every `Order` in an application with one side-effect import, including orders created before the import. Unlike `compile(order)`, this mode is lazy: `compare` and `sort` each compile on first use.

```ts
import 'ts-order/compile';
```

Use this in applications, not libraries, because it affects every `Order` in the same copy of `ts-order`. It does not affect `ts-order/comparator`. If `new Function` fails, it stops trying after the first failure (under CSP, that single check can send a violation report).

## `ts-order/comparator`

Standalone comparators and builders for `Array.prototype.sort` or the `compare` option of an `Order` step.

```ts
import { by, number, order } from "ts-order/comparator";
```

### Comparators

| Export                    | Signature                                                      | Behavior                                                         |
| ------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `compare`, `string`       | `<T extends Comparable>(a: T, b: T) => number`                 | Default `<` / `>` comparison. [Nulls](#sorting-rules) sort last. |
| `number`                  | `(a: number, b: number) => number`                             | Numeric ascending. `NaN` sorts last.                             |
| `boolean`                 | `(a: boolean, b: boolean) => number`                           | `false` before `true`.                                           |
| `date`                    | `(a: Date, b: Date) => number`                                 | Chronological ascending. Invalid dates sort last.                |
| `localeString`            | `(a: string, b: string) => number`                             | `String.prototype.localeCompare` with the default locale.        |
| `nullsFirst`, `nullsLast` | `<T>(fn: Comparator<T>) => Comparator<T \| null \| undefined>` | Moves `null` and `undefined` first or last. Does not move `NaN`. |
| `nansFirst`, `nansLast`   | `<T>(fn: Comparator<T>) => Comparator<T>`                      | Moves `NaN` first or last.                                       |

```ts
[2, null, 1].sort(compare); // [1, 2, null]
scores.sort(nullsLast(number)); // [1, 2, null]
[Number.NaN, 2, 1].sort(nansLast(number)); // [1, 2, NaN]
```

For locale-aware sorting with options (such as `numeric: true`), create one `Intl.Collator` outside the sort and pass `collator.compare`. Calling `localeCompare` with options inside a comparator creates a new collator on every comparison.

```ts
const collator = new Intl.Collator('en', { numeric: true });
files.sort(collator.compare); // ['file1', 'file2', 'file10']
```

### Builders

Mirror the `Order` methods, taking and returning plain `Comparator<T>` functions:

- `by(key, options?)`: compares by a key selector, with the same options and rules as [`Order.by`](#byselector-options).
- `order(...comparators)`: chains comparators from most to least significant.
- `map(mapper, comparator?)`: maps each value, then compares with `comparator` (defaults to `compare`).
- `reverse(compareFn)`: flips a comparator's direction.
- `when(predicate, comparator)`: puts passing values first (sorted by `comparator`). Failing values tie for later comparators.

```ts
const byName = order(
	by((u: User) => u.lastName),
	by((u: User) => u.firstName),
);

const evenFirst = order<number>(
	when((n) => n % 2 === 0, number),
	number,
);
[3, 2, 1, 4].sort(evenFirst); // [2, 4, 1, 3]
```

### Constants

`A_BEFORE_B` (`-1`), `A_AFTER_B` (`1`), and `EQUAL` (`0`) name comparator return values:

```ts
import { A_AFTER_B, A_BEFORE_B, EQUAL } from "ts-order/comparator";

const shortFirst: Comparator<string> = (a, b) =>
	a.length < b.length ? A_BEFORE_B : a.length > b.length ? A_AFTER_B : EQUAL;
```

## Types

Exported from `ts-order`:

| Type               | Meaning                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `Comparator<T>`    | `(a: T, b: T) => number`                                                       |
| `Direction`        | `'asc' \| 'desc'`                                                              |
| `KeyOptions<K, T>` | Options for `by`: `direction`, `compare`, `predicate`, `nulls`                 |
| `Comparable`       | Key types accepted by default comparison (see [Sorting rules](#sorting-rules)) |

## Upgrading and benchmarks

- [UPGRADING.md](UPGRADING.md) covers behavior changes between versions. [CHANGELOG.md](CHANGELOG.md) lists every change.
- [BENCHMARKS.md](BENCHMARKS.md) compares runtime and bundle size against native sorting and other libraries.
- [benchmarks/complex.md](benchmarks/complex.md) covers complex orderings. [benchmarks/README.md](benchmarks/README.md) explains how to run the suite.

## License

MIT
