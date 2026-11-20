import type { Comparable, Comparator, KeyOptions } from './types.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	boolean,
	by,
	collate,
	compare,
	date,
	localeString,
	nansLast,
	nullsFirst,
	number,
	order,
	when,
} from './comparator/index.js';
import { compile } from './compiled-order.js';
import { isMissing } from './missing.js';
import { Order } from './order.js';

type Item = {
	id: number;
	n: number | null | undefined;
	s: string | undefined;
	d: Date | null;
	b: boolean;
	g: number;
};
type Step = { key: (item: Item) => Comparable; options: KeyOptions<Comparable, Item> };

const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const ids = (items: Item[]) => items.map((item) => item.id);

// Small ranges, so that ties and missing keys are common.
const numberKey = fc.oneof(
	fc.integer({ min: -3, max: 3 }),
	fc.double(), // includes NaN, -0 and the infinities
	fc.constantFrom(null, undefined),
);
const stringKey = fc.option(fc.string({ maxLength: 3 }), { nil: undefined });
const dateKey = fc.option(
	fc.oneof(
		fc.date({ noInvalidDate: false }),
		fc.integer({ min: 0, max: 2 }).map((time) => new Date(time)),
	),
	{ nil: null },
);
const itemArb = fc.record({
	id: fc.constant(0),
	n: numberKey,
	s: stringKey,
	d: dateKey,
	b: fc.boolean(),
	g: fc.integer({ min: 0, max: 2 }),
});
const itemsArb = fc
	.array(itemArb, { maxLength: 40 })
	.map((items) => items.map((item, id) => ({ ...item, id })));

// Each field has its key and a custom comparator that is consistent for its values.
const fields: Record<string, { key: Step['key']; compare: Comparator<any>; mayMiss: boolean }> = {
	n: { key: (item) => item.n, compare: number, mayMiss: true },
	s: { key: (item) => item.s, compare: collate(undefined, { numeric: true }), mayMiss: true },
	d: { key: (item) => item.d, compare: date, mayMiss: true },
	b: { key: (item) => item.b, compare: boolean, mayMiss: false },
	g: { key: (item) => item.g, compare: number, mayMiss: false },
};
// The last one is the kind of predicate that when() builds.
const predicates = [
	(item: Item) => item.b,
	(item: Item) => item.g > 0,
	(item: Item) => item.b && item.g > 0,
];

const stepArb: fc.Arbitrary<Step> = fc
	.record({
		field: fc.constantFrom(...Object.keys(fields)),
		direction: fc.constantFrom(undefined, 'asc' as const, 'desc' as const),
		nulls: fc.constantFrom(undefined, 'first' as const, 'last' as const),
		custom: fc.boolean(),
		predicate: fc.option(fc.constantFrom(...predicates), { nil: undefined }),
	})
	.map(({ field, direction, nulls, custom, predicate }) => {
		const { key, compare, mayMiss } = fields[field]!;
		return {
			key,
			options: {
				direction,
				// The bundled comparators do not accept missing keys, so give them a `nulls` option.
				nulls: custom && mayMiss ? (nulls ?? 'last') : nulls,
				compare: custom ? compare : undefined,
				predicate,
			},
		};
	});
const stepsArb = fc.array(stepArb, { minLength: 1, maxLength: 4 });

const toOrder = (steps: Step[]) =>
	steps.reduce((result, step) => result.by(step.key, step.options), new Order<Item>());
const toComparator = (steps: Step[]) => order(...steps.map((step) => by(step.key, step.options)));

function isConsistent<T>(compareFn: Comparator<T>, a: T, b: T, c: T): boolean {
	const ab = compareFn(a, b);
	return (
		compareFn(a, a) === 0
		&& sign(ab) === -sign(compareFn(b, a))
		&& !(ab <= 0 && compareFn(b, c) <= 0 && compareFn(a, c) > 0)
	);
}

describe('Order properties', () => {
	it('compare is a consistent comparator', () => {
		fc.assert(
			fc.property(stepsArb, itemArb, itemArb, itemArb, (steps, a, b, c) =>
				isConsistent(toOrder(steps).compare, a, b, c),
			),
		);
	});

	it('sort gives the same result as slice().sort(compare)', () => {
		fc.assert(
			fc.property(stepsArb, itemsArb, (steps, items) => {
				const sortOrder = toOrder(steps);
				expect(ids(sortOrder.sort(items))).toEqual(ids(items.slice().sort(sortOrder.compare)));
			}),
		);
	});

	it('sort returns a sorted, stable permutation and does not change the input', () => {
		fc.assert(
			fc.property(stepsArb, itemsArb, (steps, items) => {
				const sortOrder = toOrder(steps);
				const input = items.slice();
				const sorted = sortOrder.sort(items);

				expect(items).toEqual(input);
				expect(ids(sorted).sort((a, b) => a - b)).toEqual(ids(items));
				for (let i = 1; i < sorted.length; i++) {
					const [a, b] = [sorted[i - 1]!, sorted[i]!];
					const r = sortOrder.compare(a, b);
					expect(r < 0 || (r === 0 && a.id < b.id)).toBe(true);
				}
			}),
		);
	});

	// V8 sorts fewer than 64 items by insertion only. Longer arrays also merge
	// runs, which is where an unstable tie would show.
	it('sort is stable for arrays long enough to merge runs', () => {
		fc.assert(
			fc.property(
				stepsArb,
				fc.array(itemArb, { minLength: 64, maxLength: 300 })
					.map((items) => items.map((item, id) => ({ ...item, id }))),
				(steps, items) => {
					const sorted = toOrder(steps).sort(items);
					const expected = items.slice().sort(toOrder(steps).by((item) => item.id).compare);
					expect(ids(sorted)).toEqual(ids(expected));
				},
			),
			{ numRuns: 50 },
		);
	});

	it('sort gives one result for any input order', () => {
		fc.assert(
			fc.property(
				stepsArb,
				itemsArb.chain((items) => fc.tuple(fc.constant(items), fc.shuffledSubarray(items, {
					minLength: items.length,
					maxLength: items.length,
				}))),
				(steps, [items, shuffled]) => {
					const sortOrder = toOrder(steps).by((item) => item.id);
					expect(ids(sortOrder.sort(shuffled))).toEqual(ids(sortOrder.sort(items)));
				},
			),
		);
	});

	it('sort calls each key selector at most once per item per step', () => {
		fc.assert(
			fc.property(stepsArb, itemsArb, (steps, items) => {
				let calls = 0;
				const counted = steps.map((step) => ({
					...step,
					key: (item: Item) => {
						calls++;
						return step.key(item);
					},
				}));
				toOrder(counted).sort(items);
				expect(calls).toBeLessThanOrEqual(items.length * steps.length);
			}),
		);
	});

	it('puts missing keys last, or first with nulls: first, in both directions', () => {
		fc.assert(
			fc.property(
				fc.constantFrom('n', 's', 'd'),
				fc.constantFrom('asc' as const, 'desc' as const),
				fc.constantFrom(undefined, 'first' as const),
				itemsArb,
				(field, direction, nulls, items) => {
					const { key } = fields[field]!;
					const missing = Order.by(key, { direction, nulls })
						.sort(items)
						.map((item) => isMissing(key(item)));
					const expected = missing.slice().sort((a, b) => (+b - +a) * (nulls ? 1 : -1));
					expect(missing).toEqual(expected);
				},
			),
		);
	});

	it('puts items that pass the when() guard first', () => {
		fc.assert(
			fc.property(fc.array(stepArb, { maxLength: 4 }), itemsArb, (steps, items) => {
				const guarded = new Order<Item>().when((item) => item.b, toOrder(steps));
				const passes = guarded.sort(items).map((item) => item.b);
				expect(passes).toEqual(passes.slice().sort((a, b) => +b - +a));
			}),
		);
	});

	it('reverse() negates compare when no key is missing and no step has a predicate', () => {
		fc.assert(
			fc.property(stepsArb, itemArb, itemArb, (steps, a, b) => {
				const plain = steps.map((step) => ({
					...step,
					options: { ...step.options, predicate: undefined },
				}));
				fc.pre(plain.every((step) => !isMissing(step.key(a)) && !isMissing(step.key(b))));
				const sortOrder = toOrder(plain);
				expect(sign(sortOrder.reverse().compare(a, b))).toBe(sign(sortOrder.compare(b, a)));
			}),
		);
	});
});

describe('Order and the comparator module agree', () => {
	it('chained by() steps match order(by(), ...)', () => {
		fc.assert(
			fc.property(stepsArb, itemArb, itemArb, (steps, a, b) => {
				expect(sign(toComparator(steps)(a, b))).toBe(sign(toOrder(steps).compare(a, b)));
			}),
		);
	});

	it('Order#when matches the when comparator', () => {
		fc.assert(
			fc.property(fc.array(stepArb, { maxLength: 4 }), itemArb, itemArb, (steps, a, b) => {
				const guard = (item: Item) => item.b;
				const viaOrder = new Order<Item>().when(guard, toOrder(steps)).compare(a, b);
				expect(sign(when(guard, toComparator(steps))(a, b))).toBe(sign(viaOrder));
			}),
		);
	});
});

describe('compile() matches Order', () => {
	it('compare gives the same sign', () => {
		fc.assert(
			fc.property(stepsArb, itemArb, itemArb, (steps, a, b) => {
				const sortOrder = toOrder(steps);
				expect(sign(compile(sortOrder).compare(a, b))).toBe(sign(sortOrder.compare(a, b)));
			}),
		);
	});

	it('sort gives the same result', () => {
		fc.assert(
			fc.property(stepsArb, itemsArb, (steps, items) => {
				const sortOrder = toOrder(steps);
				expect(ids(compile(sortOrder).sort(items))).toEqual(ids(sortOrder.sort(items)));
			}),
		);
	});

	it('matches after when(), map() and reverse()', () => {
		fc.assert(
			fc.property(fc.array(stepArb, { maxLength: 4 }), stepsArb, itemsArb, (inner, outer, items) => {
				const sortOrder = toOrder(outer)
					.when((item) => item.b, toOrder(inner))
					.map((item) => item, toOrder(inner).reverse());
				expect(ids(compile(sortOrder).sort(items))).toEqual(ids(sortOrder.sort(items)));
				expect(ids(items.slice().sort(compile(sortOrder).compare))).toEqual(
					ids(items.slice().sort(sortOrder.compare)),
				);
			}),
		);
	});
});

describe('comparators are consistent and return finite numbers', () => {
	const cases: [string, Comparator<any>, fc.Arbitrary<unknown>][] = [
		['compare with numbers', compare, numberKey],
		['compare with strings', compare, stringKey],
		['compare with dates', compare, dateKey],
		['compare with bigints', compare, fc.option(fc.bigInt(), { nil: undefined })],
		['number', number, fc.double()],
		['date', date, fc.date({ noInvalidDate: false })],
		['boolean', boolean, fc.boolean()],
		['localeString', localeString, fc.string({ maxLength: 4 })],
		['collate', collate(undefined, { numeric: true }), fc.string({ maxLength: 4 })],
		['nullsFirst', nullsFirst(number), numberKey],
		['nansLast', nansLast(compare), numberKey],
		['when', when((item: Item) => item.b, by((item: Item) => item.n)), itemArb],
	];

	it.each(cases)('%s', (_, compareFn, valueArb) => {
		fc.assert(
			fc.property(valueArb, valueArb, valueArb, (a, b, c) =>
				isConsistent(compareFn, a, b, c) && Number.isFinite(compareFn(a, b)),
			),
		);
	});
});
