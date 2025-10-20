# 🔢 ts-order

A tiny ([968 B](https://bundlejs.com/?q=ts-order)), type-safe sorting utility for JavaScript/TypeScript that gives you **declarative**, **composable**, and **immutable** multi-key ordering logic.

## Features

- Declarative key-based sorting
- Composable chaining with `.by()`, `.map()`, `.when()`
- Immutable API: methods return a new `Order`
- Type-safe with full inference
- DSU-optimized for costly key computations
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

// Use order's .sort() method for DSU (decorate-sort-undecorate) optimized sorting (ensure's keys are computed only once per step)
const sorted = byActiveAndName.sort(users);

// Or use the comparator directly with native Array.prototype.sort
users.sort(byActiveAndName.compare);
```

## API

### `class Order<T>`

#### `static by<T, K>(selector: (t: T) => K, options?: { direction?: 'asc' | 'desc'; compare?: (a: K, b: K) => number; predicate?: (value: T) => boolean }): Order<T>` and `by<K>(selector, options)`

Create a new order with a single sort step. Defaults to an ascending direction and natural three-way comparison (i.e. `a < b`, `a > b`).

```ts
const byAgeAsc = Order.by((u: User) => u.age);
```

You can optionally provide a custom `compare` and `direction` property.
Note: The `compare` property expects a comparator that sorts in an ascending direction; the `direction` property will flip the compare result when set to `'desc'`.

```ts
import { nullsLast } from 'ts-order/comparator';

const byNameDesc = Order.by((u: User) => u.name, {
	direction: 'desc',
	compare: (a, b) => a.localeCompare(b),
});

const byExpiryAsc = Order.by((i: Item) => i.expiresAt, {
	compare: (a, b) => a.getTime() - b.getTime(),
});

const byAgeAscNullsLast = Order.by((u: User) => u.age, {
	compare: nullsLast((a, b) => a - b),
});
```

You may also optionally pass `predicate` to run a step only when both values satisfy the guard function.

```ts
const activeUsersFirst = Order.by((u: User) => u.isActive, {
	direction: 'desc',
	predicate: (u) => u.isActive,
});
```

Every Order instance also exposes a chainable `.by()` method to append additional sort steps.

```ts
const byCreatedThenId = new Order<User>()
	.by((u) => u.createdAt)
	.by((u) => u.id);
```

#### `static reverse<T>(order: Order<T>): Order<T>` and `reverse(): Order<T>`

Flip all step directions.

```ts
const newestFirst = Order.by((u: User) => u.createdAt).reverse();
```

#### `static map<T, K>(outer: (t: T) => K, sub: Order<K>): Order<T>` and `map<K>(outer, sub)`

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

#### `static when<T>(predicate: (value: T) => boolean, order: Order<T>): Order<T>` and `when(predicate, order)`

Wrap an order with a guard so every step only runs when both values pass the predicate. This is handy for enabling blocks of steps conditionally or combining with per-step predicates.

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

#### `get compare(): (a: T, b: T) => number`

Retrieve a native comparator compatible with `Array.prototype.sort`.

```ts
items.sort(Order.by((i: Item) => i.score, { direction: 'desc' }).compare);
```

#### `static sort<T>(array: readonly T[], order: Order<T>): T[]` and `sort(array)`

Sort an array and return a **new** array.

This method implements the Schwartzian Transform or DSU (decorate-sort-undecorate) technique, which ensures that each key selector is only invoked once per element per step. For larger arrays or costly key computations, this can yield significant performance improvements over repeatedly calling the selector during comparisons.

```ts
const out = Order.sort(users, byName);
// or
const out2 = byName.sort(users);
```

---

## `ts-order/comparator` subpackage

The comparator subpackage offers a collection of standalone utilities you can use directly with native array sorting, or alongside `Order` when you need fine-grained control.

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

#### `compare<T>(a: T, b: T): number`

Natural three-way comparator that relies on `<`/`>` checks. Also exported as `string`.

```ts
['b', 'a', 'c'].sort(compare); // ['a', 'b', 'c']
```

#### `reverse<T>(comparator: (a: T, b: T) => number): Comparator<T>`

Flip the direction of a comparator.

```ts
events.sort(reverse(date)); // most recent first
```

#### `nullsFirst` and `nullsLast`

Decorate a comparator to move `null`/`undefined` values to the beginning or end of the ordering.

```ts
scores.sort(nullsLast(number)); // [1, 2, null]
```

#### `nansFirst` and `nansLast`

Handle `NaN` explicitly while delegating other values to the base comparator.

```ts
[Number.NaN, 2, 1].sort(nansLast(number)); // [1, 2, NaN]
```

#### `number`, `boolean`, `date`, `localeString`

Ready-to-use comparators for common primitives. `localeString` uses `Intl.Collator` under the hood.

```ts
scores.sort(number); // numeric sort asc (NaN's first)
users.sort(localeString); // locale-aware string sort asc
flags.sort(boolean); // boolean sort asc (false first)
createdAt.sort(date); // chronological date sort asc (invalid dates first)
```

#### `by<T, K>(key: (value: T) => K, options?: KeyOptions<K, T>): Comparator<T>`

Project values before comparing them. Accepts `direction`, `compare`, and `predicate` just like `Order.by`.

```ts
items.sort(by((item) => item.label));
```

#### `order<T>(...comparators: Comparator<T>[]): Comparator<T>`

Chain comparators from most to least significant.

```ts
users.sort(
	order(
		by((u) => u.lastName),
		by((u) => u.firstName),
	),
);
```

#### `map<T, U>(mapper: (value: T) => U, comparator?: Comparator<U>): Comparator<T>`

Adapt a comparator to operate on mapped values.

```ts
// Sort items by their nested score property
items.sort(map((item) => item.nested.score));
```

#### `when<T>(predicate: (value: T) => boolean, comparator: Comparator<T>): Comparator<T>`

Run a comparator only when both values pass a guard.

```ts
const evenNumbersFirst = order<number>(
	when((value) => value % 2 === 0, number),
	number,
);
```

## License

MIT
