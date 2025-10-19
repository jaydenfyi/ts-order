# 🔢 ts-order

A tiny, type-safe sorting toolkit for JavaScript/TypeScript that gives you **declarative**, **composable**, and **immutable** multi-key ordering logic.

---

## Highlights

- **Immutable**: Every method returns a new `Order` — no mutation, ever.
- **Composable**: Chain `.by()` steps to express complex multi-key sorts.
- **Predictable**: Each step can set `direction: 'asc' | 'desc'` and an optional `compare` function.
- **Type‑safe**: Written in TypeScript with precise generics.

---

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

#### `static by<T, K>(selector: (t: T) => K, options?: { direction?: 'asc' | 'desc'; compare?: (a: K, b: K) => number; predicate?: (value: T) => boolean }): Order<T>`

Create a new order with a single sort step.

```ts
const byAgeDesc = Order.by<User, number | null>((u) => u.age, {
	direction: 'desc',
	// Custom comparator example: treat nulls as the smallest
	compare: (a, b) =>
		a == null && b == null ? 0 : a == null ? -1 : b == null ? 1 : a - b,
});
```

Optionally pass `predicate` to run the step only when both values satisfy the guard.

```ts
const activeUsersFirst = Order.by<User, boolean>((u) => u.isActive, {
	direction: 'desc',
	predicate: (u) => u.isActive,
});
```

#### `by<K>(selector: (t: T) => K, options?: { direction?: 'asc' | 'desc'; compare?: (a: K, b: K) => number; predicate?: (value: T) => boolean }): Order<T>`

Return a **new** order with an additional sort step appended.

```ts
const byCreatedThenId = new Order<User>()
	.by((u) => u.createdAt)
	.by((u) => u.id);
```

Step-level predicates can be chained the same way:

```ts
const byActiveThenRegion = new Order<User>()
	.by((u) => u.isActive, {
		direction: 'desc',
		predicate: (u) => u.isActive,
	})
	.by((u) => u.region, {
		predicate: (u) => u.isActive,
	});
```

#### `static reverse<T>(order: Order<T>): Order<T>` and `reverse(): Order<T>`

Flip all step directions.

```ts
const newestFirst = Order.by<User, Date>((u) => u.createdAt).reverse();
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

const byAddress = Order.by<Address, string>((a) => a.city).by(
	(a) => a.postcode,
);

const byCustomerAddress = Order.map<Customer, Address>(
	(c) => c.address,
	byAddress,
);

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
items.sort(
	Order.by<Item, number>((i) => i.score, { direction: 'desc' }).compare,
);
```

#### `static sort<T>(array: readonly T[], order: Order<T>): T[]` and `sort(array)`

Sort an array and return a **new** array. If sorting by costly computed values, `Order.sort()` precomputes keys once per step.

```ts
const out = Order.sort(users, byName);
// or
const out2 = byName.sort(users);
```

---

## Comparators & direction

- If you **do not** provide `compare`, the **default** is a basic three-way compare.
- Provide a custom comparator when values need special treatment (dates, locale, null/undefined, palettes, etc.).
- `direction` applies **after** comparison: positive results flip based on `'asc' | 'desc'`.

**Date example**

```ts
const byExpiryAsc = Order.by<Item, Date>((i) => i.expiresAt, {
	compare: (a, b) => a.getTime() - b.getTime(),
});
```

**Nulls last example**

```ts
function nullsLast<T>(cmp: (a: T, b: T) => number) {
	return (a: T | null | undefined, b: T | null | undefined) =>
		a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : cmp(a, b);
}

const byAgeAscNullsLast = Order.by<User, number | null>((u) => u.age, {
	compare: nullsLast((a, b) => a - b),
});
```

---

## `ts-order/comparator` helpers

The comparator subpackage offers standalone utilities you can use directly with native array sorting, or alongside `Order` when you need fine-grained control.

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
	when,
} from 'ts-order/comparator';
```

#### `compare<T>(a: T, b: T): number`

Natural three-way comparator that relies on `<`/`>` checks. Also exported as `string`.

```ts
['b', 'a', 'c'].sort(compare); // ['a', 'b', 'c']
```

#### `reverse<T>(comparator: (a: T, b: T) => number): Comparator<T>`

Wrap a comparator so larger values come first.

```ts
const newestFirst = reverse(date);
events.sort(newestFirst);
```

#### `nullsFirst` and `nullsLast`

Decorate a comparator to move `null`/`undefined` values to the beginning or end of the ordering.

```ts
const byScoreSafely = nullsLast(number);
scores.sort(byScoreSafely); // [1, 2, null]
```

#### `nansFirst` and `nansLast`

Handle `NaN` explicitly while delegating other values to the base comparator.

```ts
const safeNumbers = nansFirst(number);
[Number.NaN, 2, 1].sort(safeNumbers); // [NaN, 1, 2]
```

#### `number`, `boolean`, `date`, `localeString`

Ready-to-use comparators for common primitives. `localeString` uses `Intl.Collator` under the hood.

```ts
users.sort((a, b) => localeString(a.lastName, b.lastName));
flags.sort(boolean); // `false` values first
```

#### `by<T, K>(key: (value: T) => K, options?: KeyOptions<K, T>): Comparator<T>`

Project values before comparing them. Accepts `direction`, `compare`, and `predicate` just like `Order.by`.

```ts
const byLabel = by((item: { label: string; active: boolean }) => item.label, {
	predicate: (item) => item.active,
});
items.sort(byLabel);
```

#### `order<T>(...comparators: Comparator<T>[]): Comparator<T>`

Chain comparators from most to least significant.

```ts
const comparator = order(
	by((u: User) => u.lastName),
	by((u) => u.firstName),
);
users.sort(comparator);
```

#### `map<T, U>(mapper: (value: T) => U, comparator?: Comparator<U>): Comparator<T>`

Adapt a comparator to operate on mapped values.

```ts
const sortByScore = map(
	(item: { nested: { score: number } }) => item.nested.score,
);
items.sort(sortByScore);
```

#### `when<T>(predicate: (value: T) => boolean, comparator: Comparator<T>): Comparator<T>`

Run a comparator only when both values pass a guard.

```ts
const evenNumbersFirst = order(
	when((value: number) => value % 2 === 0, number),
	number,
);
```

---

## License

MIT (see `LICENSE`).
