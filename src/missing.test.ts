import type { KeyOptions } from './types.js';
import { describe, expect, it, vi } from 'vitest';
import { by, compare, order } from './comparator/index.js';
import { Order } from './order.js';
import { distinctSorts } from './testing.js';

type Item<V> = { id: number; v: V };
const items = <V>(values: V[]): Item<V>[] => values.map((v, i) => ({ id: i + 1, v }));
const ids = <V>(sorted: Item<V>[]) => sorted.map((item) => item.id);

const d2020 = new Date('2020-01-01T00:00:00.000Z');
const d2021 = new Date('2021-01-01T00:00:00.000Z');
const invalid = new Date('invalid');

// Each case lists the expected ids. Missing keys tie, so the id tiebreaker orders them.
const cases: {
	name: string;
	values: unknown[];
	expected: Record<'asc' | 'desc' | 'firstAsc' | 'firstDesc', number[]>;
}[] = [
	{
		name: 'numbers with undefined, null and NaN',
		values: [3, undefined, 1, null, Number.NaN, 2],
		expected: {
			asc: [3, 6, 1, 2, 4, 5],
			desc: [1, 6, 3, 2, 4, 5],
			firstAsc: [2, 4, 5, 3, 6, 1],
			firstDesc: [2, 4, 5, 1, 6, 3],
		},
	},
	{
		name: 'dates with an invalid date, null and undefined',
		values: [d2021, invalid, null, d2020, undefined],
		expected: {
			asc: [4, 1, 2, 3, 5],
			desc: [1, 4, 2, 3, 5],
			firstAsc: [2, 3, 5, 4, 1],
			firstDesc: [2, 3, 5, 1, 4],
		},
	},
	{
		name: 'strings with undefined',
		values: ['b', undefined, 'a'],
		expected: {
			asc: [3, 1, 2],
			desc: [1, 3, 2],
			firstAsc: [2, 3, 1],
			firstDesc: [2, 1, 3],
		},
	},
];

const variants: [keyof (typeof cases)[number]['expected'], KeyOptions<unknown>][] = [
	['asc', {}],
	['desc', { direction: 'desc' }],
	['firstAsc', { nulls: 'first' }],
	['firstDesc', { nulls: 'first', direction: 'desc' }],
];

describe('missing keys', () => {
	for (const { name, values, expected } of cases) {
		describe(name, () => {
			it.each(variants)('%s: Order.by sorts to one result from every input order', (variant, options) => {
				const byV = Order.by((item: Item<unknown>) => item.v, options).by((item) => item.id);
				const sorts = distinctSorts(items(values), (p) => ids(byV.sort(p)));
				expect(sorts).toEqual(new Set([JSON.stringify(expected[variant])]));
				const viaCompare = distinctSorts(items(values), (p) => ids(p.sort(byV.compare)));
				expect(viaCompare).toEqual(sorts);
			});

			it.each(variants)('%s: the comparator by gives the same result', (variant, options) => {
				const comparator = order(
					by((item: Item<unknown>) => item.v, options),
					by((item) => item.id),
				);
				const sorts = distinctSorts(items(values), (p) => ids(p.sort(comparator)));
				expect(sorts).toEqual(new Set([JSON.stringify(expected[variant])]));
			});
		});
	}

	it('passes missing keys to a custom comparator when there is no nulls option', () => {
		const custom = vi.fn((a: number | null, b: number | null) => (a ?? 0) - (b ?? 0));
		Order.by((item: Item<number | null>) => item.v, { compare: custom }).sort(items([1, null, 2]));
		by((item: Item<number | null>) => item.v, { compare: custom })({ id: 1, v: null }, { id: 2, v: 1 });

		expect(custom.mock.calls.flat()).toContain(null);
	});

	it('never passes missing keys to a custom comparator with a nulls option', () => {
		const custom = vi.fn((a: number | null | undefined, b: number | null | undefined) => a! - b!);
		const values = items([2, null, 1, undefined, 3]);
		const sorted = Order.by((item: Item<number | null | undefined>) => item.v, {
			compare: custom,
			nulls: 'last',
		}).sort(values);
		values.sort(by((item) => item.v, { compare: custom, nulls: 'last' }));

		expect(ids(sorted)).toEqual([3, 1, 5, 2, 4]);
		expect(ids(values)).toEqual([3, 1, 5, 2, 4]);
		expect(custom.mock.calls.flat().every((value) => typeof value === 'number')).toBe(true);
	});

	it('ties equal dates that are different objects, so the next step decides', () => {
		const values = items([new Date(d2020.getTime()), d2021, new Date(d2020.getTime())]);
		const byDate = Order.by((item: Item<Date>) => item.v, { direction: 'desc' }).by(
			(item) => item.id,
			{ direction: 'desc' },
		);
		expect(ids(byDate.sort(values))).toEqual([2, 3, 1]);
		expect(ids(values.slice().sort(byDate.compare))).toEqual([2, 3, 1]);
	});

	it('sorts missing values last with the exported compare', () => {
		expect([2, null, Number.NaN, 1].sort(compare)).toEqual([1, 2, null, Number.NaN]);
		expect(compare(null, undefined)).toBe(0);
		expect(compare(d2020, new Date(d2020.getTime()))).toBe(0);
	});
});
