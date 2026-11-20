// Complex orderings: conditional rules, custom ranks, missing keys, locale
// collation, nested reusable orders and a computed key. The report shows the
// code between `#region` markers verbatim, so the code shown is the code timed.
import type { Comparator } from 'ts-order';
import { compile, Order } from 'ts-order';
import { random, shuffle } from './cases.js';

export type Customer = {
	tier: 'gold' | 'silver' | 'standard';
	lastName: string;
	firstName: string;
};
export type Shipment = {
	id: number;
	express: boolean;
	promisedAt: number | null;
	status: 'blocked' | 'awaiting-stock' | 'packing' | 'ready' | 'shipped';
	createdAt: number;
	lastReviewedAt: number | null;
	customer: Customer;
	lines: { priceCents: number; quantity: number; discountPercent: number }[];
};
export type ShipmentSorter = (input: readonly Shipment[]) => Shipment[];

// #region shared
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
// #endregion shared

// #region customer-ts-order
const byCustomer = new Order<Customer>()
	.by((c) => TIER_RANK[c.tier])
	.by((c) => c.lastName, { compare: collator.compare })
	.by((c) => c.firstName, { compare: collator.compare });
// #endregion customer-ts-order

// #region customer-native
function compareCustomers(a: Customer, b: Customer): number {
	return (
		TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
		collator.compare(a.lastName, b.lastName) ||
		collator.compare(a.firstName, b.firstName)
	);
}
// #endregion customer-native

// #region triage-ts-order
const triage = new Order<Shipment>()
	.when(
		(s) => s.express,
		Order.by((s) => s.promisedAt), // missing deadlines go last
	)
	.by((s) => STATUS_RANK[s.status])
	.by((s) => s.createdAt, { direction: 'desc' })
	.map((s) => s.customer, byCustomer);
// #endregion triage-ts-order

// #region triage-native
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
// #endregion triage-native

// #region triage-native-cached
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
// #endregion triage-native-cached

// #region review-ts-order
const review = Order.map((s: Shipment) => s.customer, byCustomer)
	.by((s) => s.lastReviewedAt, { nulls: 'first' }) // never reviewed first
	.by(orderValue, { direction: 'desc' });
// #endregion review-ts-order

// #region review-native
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
// #endregion review-native

// #region review-native-cached
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
// #endregion review-native-cached

export const COMPLEX_IMPLEMENTATIONS = [
	{ id: 'native', label: 'Native handwritten comparator' },
	{ id: 'native-cached', label: 'Native handwritten, cached keys' },
	{ id: 'ts-order-class', label: 'ts-order `order.sort()`' },
	{ id: 'ts-order-compare', label: 'ts-order `toSorted(order.compare)`' },
	{ id: 'ts-order-compiled', label: 'ts-order compiled sort' },
	{ id: 'ts-order-compiled-compare', label: 'ts-order compiled compare' },
] as const;

export type ComplexScenario = {
	id: string;
	title: string;
	description: string;
	/** Independent reference: the handwritten comparator. */
	reference: Comparator<Shipment>;
	sorters: Record<
		(typeof COMPLEX_IMPLEMENTATIONS)[number]['id'],
		ShipmentSorter
	>;
};

function orderSorters(
	order: Order<Shipment>,
): Omit<ComplexScenario['sorters'], 'native' | 'native-cached'> {
	const compiled = compile(order);
	// Generate code outside the timed sorts.
	compiled.sort([]);
	const compiledCompare = compiled.compare;
	const compare = order.compare;
	return {
		'ts-order-class': (input) => order.sort(input),
		'ts-order-compare': (input) => input.toSorted(compare),
		'ts-order-compiled': (input) => compiled.sort(input),
		'ts-order-compiled-compare': (input) => input.toSorted(compiledCompare),
	};
}

export const COMPLEX_SCENARIOS: ComplexScenario[] = [
	{
		id: 'triage',
		title: 'Warehouse triage queue',
		description:
			'Express shipments first, by promised deadline with unknown deadlines last; then everything by a custom status rank, newest first, and finally by customer (tier rank, then locale-aware surname and first name).',
		reference: compareTriage,
		sorters: {
			native: (input) => input.toSorted(compareTriage),
			'native-cached': sortTriageCached,
			...orderSorters(triage),
		},
	},
	{
		id: 'review',
		title: 'Account review list',
		description:
			'The same reusable customer ordering, then never-reviewed shipments first, oldest review next, then the computed order value (discounted line items) descending.',
		reference: compareReview,
		sorters: {
			native: (input) => input.toSorted(compareReview),
			'native-cached': sortReviewCached,
			...orderSorters(review),
		},
	},
];

export function makeShipments(size: number, seed = 20261120): Shipment[] {
	const next = random(seed);
	const integer = (max: number) => Math.floor(next() * max);
	const pick = <T>(values: readonly T[]): T =>
		values[integer(values.length)]!;
	// Accents and particles make locale collation differ from `<`.
	const surnames = [
		'Ångström',
		'Chen',
		'de la Cruz',
		'Dubois',
		'Émond',
		'García',
		'Kim',
		'MacDonald',
		'Novák',
		'Patel',
		'Smith',
		'Østergaard',
	];
	const firstNames = ['Ada', 'Ana', 'Élodie', 'Jonas', 'Li', 'Noah', 'Zoë'];
	const statuses = Object.keys(STATUS_RANK) as Shipment['status'][];
	const day = 86_400_000;
	const start = Date.UTC(2026, 0, 1);
	const shipments: Shipment[] = [];
	for (let id = 0; id < size; id++) {
		// Repeated shipments make full ties intentional, even in small fixtures.
		if (id > 0 && id % 20 === 0) {
			shipments.push({ ...shipments[id - 1]!, id });
			continue;
		}
		const express = next() < 0.2;
		shipments.push({
			id,
			express,
			promisedAt: next() < 0.25 ? null : start + integer(30) * day,
			status: pick(statuses),
			createdAt: start + integer(60) * day,
			lastReviewedAt:
				next() < 0.25 ? null : start + integer(26) * 7 * day,
			customer: {
				tier: pick(['gold', 'silver', 'standard'] as const),
				lastName: pick(surnames),
				firstName: pick(firstNames),
			},
			lines: Array.from({ length: 1 + integer(12) }, () => ({
				priceCents: 100 + integer(500) * 100,
				quantity: 1 + integer(5),
				discountPercent: pick([0, 0, 0, 10, 20]),
			})),
		});
	}
	return shuffle(shipments, seed ^ 11_259_375);
}

/** Source between `// #region name` and `// #endregion name` in this file. */
export function region(source: string, name: string): string {
	const match = new RegExp(
		`// #region ${name}\\n([\\s\\S]*?)// #endregion ${name}`,
	).exec(source);
	if (!match) throw new Error(`Missing region: ${name}`);
	return match[1]!.trimEnd();
}
