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

// Use order's .sort() method for DSU (decorate-sort-undecorate) optimized sorting
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
const base = new Order<User>().by((u) => u.region);

const scoreBlock = Order.by<User, number>((u) => u.score, {
	direction: 'desc',
	predicate: (u) => u.score != null,
});

const euOnly = base.when((u) => u.region === 'eu', scoreBlock);

// In this comparator:
// - The base region step always runs.
// - `scoreBlock` runs only when BOTH values have a score AND belong to the EU.
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

## Recipes

### Palette / custom order

```ts
const palette = [
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'indigo',
	'violet',
] as const;
const paletteRank = new Map(pallete.map((v, i) => [v, i]));

const byPalette = new Order<{ color: string }>().by((x) =>
	paletteRank.get(x.color),
);
```

### Multi-key with final tiebreaker

```ts
const byRoleRankThenNameThenId = new Order<User>()
	.by((u) => roleRank(u.role))
	.by((u) => u.lastName)
	.by((u) => u.firstName)
	.by((u) => u.id);
```

### Nested map (lift an order into a parent type)

```ts
const byCityPostcode = new Order<Address>()
	.by((a) => a.city)
	.by((a) => a.postcode);

const byCustomer = Order.map<Customer, Address>(
	(c) => c.address,
	byCityPostcode,
);
```

### Reverse everything

```ts
const newestFirst = Order.by<User, Date>((u) => u.createdAt).reverse();
```

### Use as a drop-in comparator

```ts
arr.sort(Order.by<Item, number>((i) => i.score, { direction: 'desc' }).compare);
```

---

## TypeScript notes

- All methods are fully typed and infer `T` and step key types.
- `Order.by<T, K>(selector)` lets you specify `K` when inference needs help (e.g., unions with `null`).
- `.compare` matches the native `(a: T, b: T) => number` signature.

---

## Package & builds

- Ships ESM and CJS builds with type declarations.
- No runtime dependencies.

> If you need a leaner or a more aggressively inlined variant, consider publishing separate entry points (e.g., `ts-order/optimized`).

---

## FAQ

**Is the sort stable?**
The implementation relies on the engine’s stable `Array.prototype.sort`. Equal items (comparator returns `0`) keep their original relative order.

**How do I handle `null`/`undefined`?**
Use a custom comparator that orders them first/last, or map them in the selector to a sentinel value.

**Can I compose orders across nested objects?**
Yes—use `Order.map(outer, sub)` to lift an order for a nested type into the parent.

---

## Roadmap / ideas

- Comparator helpers (e.g., `nullsFirst`, `nullsLast`, locale-aware string helpers).
- Additional conditional / masking utilities for step enablement.
- Optional pre-baked orders for common domains (dates, palettes, locales).

---

## Contributing

1. Fork & clone the repo
2. Install deps and run tests/benchmarks
3. Open a PR describing your change and performance impact if relevant

Please include reproducible benchmarks when changing hot paths.

---

## License

MIT (see `LICENSE`).

---

## Appendix: Full API surface (current)

```ts
export class Order<T> {
	constructor();
	constructor(source: Order<T> | null | undefined);
	constructor(sources: Iterable<Order<T> | null | undefined>);

	static by<T, K>(
		selector: (item: T) => K,
		options?: {
			direction?: 'asc' | 'desc';
			compare?: (a: K, b: K) => number;
			predicate?: (value: T) => boolean;
		},
	): Order<T>;

	by<K>(
		selector: (item: T) => K,
		options?: {
			direction?: 'asc' | 'desc';
			compare?: (a: K, b: K) => number;
			predicate?: (value: T) => boolean;
		},
	): Order<T>;

	static reverse<T>(input: Order<T>): Order<T>;
	reverse(): Order<T>;

	static map<T, K>(outer: (t: T) => K, sub: Order<K>): Order<T>;
	map<K>(outer: (t: T) => K, sub: Order<K>): Order<T>;

	static when<T>(predicate: (value: T) => boolean, order: Order<T>): Order<T>;
	when(predicate: (value: T) => boolean, order: Order<T>): Order<T>;

	get compare(): (a: T, b: T) => number;

	static sort<T>(array: readonly T[], order: Order<T>): T[];
	sort(array: readonly T[]): T[];
}
```
