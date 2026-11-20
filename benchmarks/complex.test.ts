import type { Shipment } from './complex.js';
import { describe, expect, it } from 'vitest';
import { COMPLEX_SCENARIOS, makeShipments, region } from './complex.js';
import { validateSort } from './validate.js';

const day = 86_400_000;
function shipment(
	id: number,
	fields: Partial<Omit<Shipment, 'customer'>> & {
		customer?: Partial<Shipment['customer']>;
	},
): Shipment {
	return {
		id,
		express: false,
		promisedAt: null,
		status: 'packing',
		createdAt: 0,
		lastReviewedAt: null,
		lines: [{ priceCents: 100, quantity: 1, discountPercent: 0 }],
		...fields,
		customer: {
			tier: 'standard',
			lastName: 'Smith',
			firstName: 'Ada',
			...fields.customer,
		},
	};
}

const triage = [
	shipment(1, { status: 'blocked' }),
	shipment(2, { express: true, promisedAt: null, status: 'blocked' }),
	shipment(3, { express: true, promisedAt: 2 * day, status: 'shipped' }),
	shipment(4, { express: true, promisedAt: day, status: 'shipped' }),
	// Non-express deadlines are ignored.
	shipment(5, { status: 'blocked', promisedAt: 0, createdAt: day }),
	shipment(6, { status: 'blocked', customer: { tier: 'gold' } }),
	shipment(7, { status: 'blocked', customer: { lastName: 'Ångström' } }),
	shipment(8, { status: 'blocked' }),
];
const review = [
	shipment(1, { lastReviewedAt: day }),
	shipment(2, { lastReviewedAt: null }),
	shipment(3, {
		lastReviewedAt: day,
		lines: [{ priceCents: 500, quantity: 1, discountPercent: 20 }],
	}),
	shipment(4, { customer: { lastName: 'Émond' }, lastReviewedAt: day }),
	shipment(5, { customer: { lastName: 'de la Cruz' } }),
	shipment(6, { customer: { firstName: 'Zoë' } }),
	shipment(7, { lastReviewedAt: day }),
];
const expectedIds: Record<string, [Shipment[], number[]]> = {
	// Express by deadline (missing last), then status, newest, customer.
	triage: [triage, [4, 3, 2, 5, 6, 7, 1, 8]],
	// Customer, never-reviewed first, then value descending; ties stay in input order.
	review: [review, [5, 4, 2, 3, 1, 7, 6]],
};

describe('complex benchmark correctness', () => {
	for (const scenario of COMPLEX_SCENARIOS) {
		it(`${scenario.id}: every implementation matches hand-calculated results`, () => {
			const [input, ids] = expectedIds[scenario.id]!;
			const expected = ids.map((id) => input.find((s) => s.id === id)!);
			for (const [id, sort] of Object.entries(scenario.sorters)) {
				validateSort(sort, input, expected, id);
				validateSort(sort, [], [], id);
			}
		});

		it(`${scenario.id}: every implementation agrees on generated data, including ties`, () => {
			const input = makeShipments(2_000);
			const expected = input.slice().sort(scenario.reference);
			for (const [id, sort] of Object.entries(scenario.sorters))
				validateSort(sort, input, expected, id);
		});
	}

	it('extracts report code regions', () => {
		expect(region('// #region a\nx\n// #endregion a', 'a')).toBe('x');
		expect(() => region('', 'a')).toThrow('Missing region');
	});
});
