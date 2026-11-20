# Complex ordering benchmarks

[Simple-key benchmarks](../BENCHMARKS.md) compare ts-order with other libraries on one to three plain keys. This page covers what those leave out: conditional rules, custom ranks, missing values, locale collation, reusable nested orders and a computed key. Only native comparators and ts-order are compared. Other libraries express these rules differently or not at all, so a like-for-like row would mostly measure custom glue code.

Shuffled input · 5 rounds · median of round means · 10, 100, 1,000, 10,000, 100,000 shipments. **1.00× = the handwritten native comparator** in that column; lower is faster. Every implementation returns the same array, including the order of tied items, checked before and after timing.

Line counts skip blank lines and comments. Both workloads share these helpers, which are not counted:

```ts
const collator = new Intl.Collator('en');
const STATUS_RANK = {
	blocked: 0,
	'awaiting-stock': 1,
	packing: 2,
	ready: 3,
	shipped: 4,
};
const TIER_RANK = { gold: 0, silver: 1, standard: 2 };

function orderValue(shipment: Shipment): number {
	let total = 0;
	for (const line of shipment.lines)
		total += Math.round(
			(line.priceCents * line.quantity * (100 - line.discountPercent)) /
				100,
		);
	return total;
}
```

They also share a customer ordering: tier rank, then locale-aware surname and first name.

| ts-order | Native |
| --- | --- |
| 4 lines | 7 lines |

```ts
const byCustomer = new Order<Customer>()
	.by((c) => TIER_RANK[c.tier])
	.by((c) => c.lastName, { compare: collator.compare })
	.by((c) => c.firstName, { compare: collator.compare });
```

```ts
function compareCustomers(a: Customer, b: Customer): number {
	return (
		TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
		collator.compare(a.lastName, b.lastName) ||
		collator.compare(a.firstName, b.firstName)
	);
}
```

## Warehouse triage queue

Express shipments first, by promised deadline with unknown deadlines last; then everything by a custom status rank, newest first, and finally by customer (tier rank, then locale-aware surname and first name).

| Implementation | 10 (µs) | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | 1.03 · 1.93× | 17.5 · 1.24× | 323 · 0.99× | 5.69 · 0.90× | 117 · 0.80× |
| Native handwritten, cached keys | 0.507 · 0.95× | 9.91 · 0.70× | 240 · 0.74× | 5.29 · 0.83× | 135 · 0.92× |
| Native handwritten comparator | 0.535 · 1.00× | 14.1 · 1.00× | 327 · 1.00× | 6.34 · 1.00× | 147 · 1.00× |
| ts-order compiled compare | 0.516 · 0.97× | 14.3 · 1.02× | 343 · 1.05× | 7.66 · 1.21× | 173 · 1.18× |
| ts-order `order.sort()` | 1.74 · 3.25× | 30.6 · 2.17× | 519 · 1.59× | 8.67 · 1.37× | 178 · 1.21× |
| ts-order `toSorted(order.compare)` | 1.08 · 2.03× | 32.7 · 2.32× | 662 · 2.03× | 12.5 · 1.97× | 251 · 1.71× |

### ts-order (8 lines)

The same order runs as `order.sort(items)`, `items.toSorted(order.compare)` or `compile(order).sort(items)`.

```ts
const triage = new Order<Shipment>()
	.when(
		(s) => s.express,
		Order.by((s) => s.promisedAt), // missing deadlines go last
	)
	.by((s) => STATUS_RANK[s.status])
	.by((s) => s.createdAt, { direction: 'desc' })
	.map((s) => s.customer, byCustomer);
```

### Native comparator (13 lines)

```ts
function compareTriage(a: Shipment, b: Shipment): number {
	if (a.express !== b.express) return a.express ? -1 : 1;
	if (a.express && a.promisedAt !== b.promisedAt) {
		if (a.promisedAt === null) return 1;
		if (b.promisedAt === null) return -1;
		return a.promisedAt - b.promisedAt;
	}
	return (
		STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
		b.createdAt - a.createdAt ||
		compareCustomers(a.customer, b.customer)
	);
}
```

<details><summary>Native with cached keys (24 lines)</summary>

This version computes each key once per item, like `order.sort()` does. The comparator logic is repeated against the cached fields.

```ts
function sortTriageCached(input: readonly Shipment[]): Shipment[] {
	const rows = input.map((s) => ({
		s,
		express: s.express,
		promisedAt: s.express ? s.promisedAt : null,
		status: STATUS_RANK[s.status],
		createdAt: s.createdAt,
		customer: s.customer,
	}));
	rows.sort((a, b) => {
		if (a.express !== b.express) return a.express ? -1 : 1;
		if (a.express && a.promisedAt !== b.promisedAt) {
			if (a.promisedAt === null) return 1;
			if (b.promisedAt === null) return -1;
			return a.promisedAt - b.promisedAt;
		}
		return (
			a.status - b.status ||
			b.createdAt - a.createdAt ||
			compareCustomers(a.customer, b.customer)
		);
	});
	return rows.map((row) => row.s);
}
```

</details>

## Account review list

The same reusable customer ordering, then never-reviewed shipments first, oldest review next, then the computed order value (discounted line items) descending.

| Implementation | 10 (µs) | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | 1.65 · 1.14× | 45.4 · 0.93× | 767 · 0.88× | 10.9 · 0.81× | 182 · 0.73× |
| Native handwritten, cached keys | 1.67 · 1.15× | 51.3 · 1.04× | 906 · 1.04× | 12.4 · 0.92× | 219 · 0.88× |
| ts-order `order.sort()` | 2.33 · 1.61× | 58.4 · 1.19× | 955 · 1.10× | 13 · 0.97× | 246 · 0.99× |
| Native handwritten comparator | 1.45 · 1.00× | 49.1 · 1.00× | 872 · 1.00× | 13.5 · 1.00× | 248 · 1.00× |
| ts-order compiled compare | 1.82 · 1.26× | 60.2 · 1.23× | 1,070 · 1.22× | 15.7 · 1.17× | 314 · 1.27× |
| ts-order `toSorted(order.compare)` | 2.83 · 1.96× | 87.1 · 1.77× | 1,520 · 1.74× | 22.5 · 1.67× | 396 · 1.60× |

### ts-order (3 lines)

The same order runs as `order.sort(items)`, `items.toSorted(order.compare)` or `compile(order).sort(items)`.

```ts
const review = Order.map((s: Shipment) => s.customer, byCustomer)
	.by((s) => s.lastReviewedAt, { nulls: 'first' }) // never reviewed first
	.by(orderValue, { direction: 'desc' });
```

### Native comparator (10 lines)

```ts
function compareReview(a: Shipment, b: Shipment): number {
	const byCustomer = compareCustomers(a.customer, b.customer);
	if (byCustomer) return byCustomer;
	if (a.lastReviewedAt !== b.lastReviewedAt) {
		if (a.lastReviewedAt === null) return -1;
		if (b.lastReviewedAt === null) return 1;
		return a.lastReviewedAt - b.lastReviewedAt;
	}
	return orderValue(b) - orderValue(a);
}
```

<details><summary>Native with cached keys (19 lines)</summary>

This version computes each key once per item, like `order.sort()` does. The comparator logic is repeated against the cached fields.

```ts
function sortReviewCached(input: readonly Shipment[]): Shipment[] {
	const rows = input.map((s) => ({
		s,
		customer: s.customer,
		lastReviewedAt: s.lastReviewedAt,
		value: orderValue(s),
	}));
	rows.sort((a, b) => {
		const byCustomer = compareCustomers(a.customer, b.customer);
		if (byCustomer) return byCustomer;
		if (a.lastReviewedAt !== b.lastReviewedAt) {
			if (a.lastReviewedAt === null) return -1;
			if (b.lastReviewedAt === null) return 1;
			return a.lastReviewedAt - b.lastReviewedAt;
		}
		return b.value - a.value;
	});
	return rows.map((row) => row.s);
}
```

</details>

## Environment

Measured 2026-11-20T06:31:57.791Z on Node v24.22.3 (V8 13.6.233.17-node.63), darwin 24.5.0 arm64, Apple M1 Pro. Commit `9506f67` with local changes. Tinybench: at least 50 ms and 3 samples per cell after a 20 ms warm-up. One machine and one runtime; repeat on your target before relying on small differences.

Reproduce with `bun run bench:complex`.
