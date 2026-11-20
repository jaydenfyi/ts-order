# Complex ordering benchmarks

[Simple-key benchmarks](../BENCHMARKS.md) compare ts-order with other libraries on one to three plain keys. This page covers what those leave out: conditional rules, custom ranks, missing values, locale collation, reusable nested orders and a computed key. Only native comparators and ts-order are compared. Other libraries express these rules differently or not at all, so a like-for-like row would mostly measure custom glue code.

Shuffled input · 2 rounds · median of round means · 10, 100, 1,000, 10,000, 100,000 shipments. **1.00× = the handwritten native comparator** in that column; lower is faster. Every implementation returns the same array, including the order of tied items, checked before and after timing.

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
| ts-order compiled sort | 1 · 1.65× | 17.7 · 1.23× | 5,670 · 17.44× | 5.89 · 0.92× | 129 · 0.84× |
| Native handwritten, cached keys | 0.523 · 0.86× | 10.2 · 0.71× | 241 · 0.74× | 5.55 · 0.87× | 148 · 0.97× |
| Native handwritten comparator | 0.608 · 1.00× | 14.4 · 1.00× | 325 · 1.00× | 6.41 · 1.00× | 153 · 1.00× |
| ts-order compiled compare | 0.544 · 0.89× | 14.3 · 1.00× | 452 · 1.39× | 7.83 · 1.22× | 174 · 1.14× |
| ts-order `order.sort()` | 1.6 · 2.63× | 30.5 · 2.13× | 546 · 1.68× | 9.13 · 1.42× | 197 · 1.29× |
| ts-order `toSorted(order.compare)` | 1.02 · 1.67× | 32.8 · 2.28× | 2,900 · 8.91× | 13 · 2.02× | 255 · 1.67× |

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
| ts-order compiled sort | 1.71 · 1.13× | 46.2 · 0.94× | 770 · 0.88× | 14 · 1.05× | 190 · 0.76× |
| ts-order `order.sort()` | 2.35 · 1.54× | 57.8 · 1.18× | 958 · 1.10× | 13.6 · 1.01× | 245 · 0.97× |
| Native handwritten, cached keys | 1.78 · 1.17× | 52.5 · 1.07× | 901 · 1.03× | 12.4 · 0.92× | 247 · 0.98× |
| Native handwritten comparator | 1.52 · 1.00× | 48.9 · 1.00× | 872 · 1.00× | 13.4 · 1.00× | 252 · 1.00× |
| ts-order compiled compare | 1.86 · 1.22× | 60.6 · 1.24× | 1,060 · 1.21× | 15.9 · 1.19× | 311 · 1.24× |
| ts-order `toSorted(order.compare)` | 2.79 · 1.84× | 91.2 · 1.86× | 1,510 · 1.73× | 23.2 · 1.73× | 420 · 1.67× |

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

Measured 2026-11-20T05:43:42.751Z on Node v24.22.3 (V8 13.6.233.17-node.63), darwin 24.5.0 arm64, Apple M1 Pro. Commit `533ee99` with local changes. Tinybench: at least 50 ms and 3 samples per cell after a 20 ms warm-up. One machine and one runtime; repeat on your target before relying on small differences.

Reproduce with `bun run bench:complex`.
