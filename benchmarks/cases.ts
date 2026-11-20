export type Purchase = {
	id: number;
	totalCents: number;
	status: number;
	createdAt: number;
	customer: { lastName: string };
	lines: { priceCents: number; quantity: number; discountPercent: number }[];
};

export type Sorter = (input: readonly Purchase[]) => Purchase[];
export type ScenarioId = 'total' | 'fulfillment' | 'computed';
export type Scenario = {
	id: ScenarioId;
	title: string;
	/** Independent reference the timed outputs are checked against. */
	reference: (a: Purchase, b: Purchase) => number;
};

export const SIZES = [10, 100, 1_000, 10_000, 100_000];
export const SHAPES = [
	'shuffled',
	'sorted',
	'reversed',
	'nearly-sorted',
] as const;
export type Shape = (typeof SHAPES)[number];

export function computedTotal(purchase: Purchase): number {
	return purchase.lines.reduce(
		(total, line) =>
			total +
			Math.round(
				(line.priceCents *
					line.quantity *
					(100 - line.discountPercent)) /
					100,
			),
		0,
	);
}

export const SCENARIOS: Scenario[] = [
	{
		id: 'total',
		title: 'Stored order total, ascending',
		reference: (a, b) => a.totalCents - b.totalCents,
	},
	{
		id: 'fulfillment',
		title: 'Fulfillment queue: status ↑, newest first, customer surname ↑',
		reference: (a, b) =>
			a.status - b.status ||
			b.createdAt - a.createdAt ||
			(a.customer.lastName < b.customer.lastName
				? -1
				: a.customer.lastName > b.customer.lastName
					? 1
					: 0),
	},
	{
		id: 'computed',
		title: 'Computed line-item total after discounts, descending',
		reference: (a, b) => computedTotal(b) - computedTotal(a),
	},
];

export function random(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 0x1_0000_0000;
	};
}

export function shuffle<T>(input: readonly T[], seed: number): T[] {
	const result = [...input];
	const next = random(seed);
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		[result[i], result[j]] = [result[j]!, result[i]!];
	}
	return result;
}

export function makePurchases(size: number, seed = 20261119): Purchase[] {
	const next = random(seed);
	const integer = (max: number) => Math.floor(next() * max);
	const surnames = [
		'Smith',
		'Chen',
		'Patel',
		'Brown',
		'Garcia',
		'Wilson',
		'Kim',
		'Martin',
		'Jones',
		'Taylor',
	];
	const purchases: Purchase[] = [];
	for (let id = 0; id < size; id++) {
		// Repeated orders make full-key ties intentional, even in small fixtures.
		if (id > 0 && id % 20 === 0) {
			purchases.push({ ...purchases[id - 1]!, id });
			continue;
		}
		const purchase: Purchase = {
			id,
			totalCents: 0,
			status: integer(5),
			createdAt: Date.UTC(2026, 0, 1) + integer(180) * 86_400_000,
			customer: { lastName: surnames[integer(surnames.length)]! },
			lines: Array.from({ length: 1 + integer(12) }, () => ({
				priceCents: 100 + integer(500) * 100,
				quantity: 1 + integer(5),
				discountPercent: [0, 0, 0, 10, 20][integer(5)]!,
			})),
		};
		purchase.totalCents = computedTotal(purchase);
		purchases.push(purchase);
	}
	return shuffle(purchases, seed ^ 11_259_375);
}

export function shapeInput(
	input: readonly Purchase[],
	scenario: Scenario,
	shape: Shape,
): Purchase[] {
	if (shape === 'shuffled') return [...input];
	const sorted = [...input].sort(scenario.reference);
	if (shape === 'reversed') return sorted.reverse();
	if (shape === 'nearly-sorted') {
		const next = random(9137);
		for (let i = 0; i < Math.ceil(sorted.length / 100); i++) {
			const a = Math.floor(next() * sorted.length);
			const b = Math.floor(next() * sorted.length);
			[sorted[a], sorted[b]] = [sorted[b]!, sorted[a]!];
		}
	}
	return sorted;
}
