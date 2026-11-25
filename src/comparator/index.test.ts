import { describe, expect, it, vi } from 'vitest';
import {
	A_AFTER_B,
	A_BEFORE_B,
	boolean as booleanComparator,
	by,
	compare,
	date as dateComparator,
	EQUAL,
	map,
	nansFirst,
	nansLast,
	nullsFirst,
	nullsLast,
	number as numberComparator,
	order,
	reverse,
	string,
	when,
} from './index.js';

describe('comparator constants', () => {
	it('are -1, 1 and 0', () => {
		expect([A_BEFORE_B, A_AFTER_B, EQUAL]).toEqual([-1, 1, 0]);
	});
});

describe(reverse, () => {
	it('swaps comparator arguments to flip the sort order', () => {
		const base = vi.fn((a: number, b: number) => a - b);
		const reversed = reverse(base);

		expect(reversed(1, 2)).toBe(1);
		expect(base).toHaveBeenLastCalledWith(2, 1);

		base.mockClear();
		expect(reversed(3, 1)).toBeLessThan(0);
		expect(base).toHaveBeenLastCalledWith(1, 3);
	});
});

describe(nullsFirst, () => {
	it('orders nullish values before non-null values', () => {
		const base = vi.fn(compare<number>);
		const comparator = nullsFirst(base);

		expect(comparator(null, 5)).toBe(-1);
		expect(comparator(undefined, 10)).toBe(-1);
		expect(comparator(null, undefined)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});

	it('delegates to the base comparator when both values are non-nullish', () => {
		const base = vi.fn(compare<number>);
		const comparator = nullsFirst(base);

		expect(comparator(1, 2)).toBe(-1);
		expect(base).toHaveBeenCalledTimes(1);
		expect(base).toHaveBeenLastCalledWith(1, 2);
	});
});

describe(nullsLast, () => {
	it('ties two equal values without calling the base comparator', () => {
		// This comparator breaks the contract: it never returns 0.
		const base = vi.fn((a: number, b: number) => (a < b ? -1 : 1));
		expect(nullsLast(base)(3, 3)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});

	it('orders nullish values after non-null values', () => {
		const base = vi.fn(compare<number>);
		const comparator = nullsLast(base);

		expect(comparator(null, 5)).toBe(1);
		expect(comparator(undefined, 10)).toBe(1);
		expect(comparator(null, undefined)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});

	it('delegates to the base comparator when both values are non-nullish', () => {
		const base = vi.fn(compare<number>);
		const comparator = nullsLast(base);

		expect(comparator(3, 1)).toBe(1);
		expect(base).toHaveBeenCalledTimes(1);
		expect(base).toHaveBeenLastCalledWith(3, 1);
	});
});

describe(nansFirst, () => {
	it('moves NaN values to the front', () => {
		const base = vi.fn((a: number, b: number) => a - b);
		const comparator = nansFirst(base);

		expect(comparator(Number.NaN, 5)).toBe(-1);
		expect(comparator(5, Number.NaN)).toBe(1);
		expect(comparator(Number.NaN, Number.NaN)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});

	it('falls back to the base comparator when neither value is NaN', () => {
		const base = vi.fn((a: number, b: number) => a - b);
		const comparator = nansFirst(base);

		expect(comparator(2, 3)).toBe(-1);
		expect(base).toHaveBeenCalledTimes(1);
		expect(base).toHaveBeenLastCalledWith(2, 3);
	});
});

describe(nansLast, () => {
	it('moves NaN values to the end', () => {
		const base = vi.fn((a: number, b: number) => a - b);
		const comparator = nansLast(base);

		expect(comparator(Number.NaN, 5)).toBe(1);
		expect(comparator(5, Number.NaN)).toBe(-1);
		expect(comparator(Number.NaN, Number.NaN)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});

	it('falls back to the base comparator when neither value is NaN', () => {
		const base = vi.fn((a: number, b: number) => a - b);
		const comparator = nansLast(base);

		expect(comparator(4, 1)).toBeGreaterThan(0);
		expect(base).toHaveBeenCalledTimes(1);
		expect(base).toHaveBeenLastCalledWith(4, 1);
	});
});

describe(compare, () => {
	it('performs natural ordering across values', () => {
		expect(compare(1, 2)).toBe(-1);
		expect(compare('b', 'a')).toBe(1);
		expect(compare('same', 'same')).toBe(0);
	});
});

describe(string, () => {
	it('is an alias for compare and preserves behaviour', () => {
		expect(string).toBe(compare);
		expect(string('alpha', 'beta')).toBeLessThan(0);
	});
});

describe(numberComparator, () => {
	it('orders numbers while handling NaN values', () => {
		expect(numberComparator(1, 2)).toBe(-1);
		expect(numberComparator(3, 1)).toBe(1);
		expect(numberComparator(Number.NaN, Number.NaN)).toBe(0);
		expect(numberComparator(Number.NaN, 5)).toBe(1);
		expect(numberComparator(5, Number.NaN)).toBe(-1);
	});

	it('treats equal infinities as equal', () => {
		expect(numberComparator(Infinity, Infinity)).toBe(0);
		expect(numberComparator(-Infinity, -Infinity)).toBe(0);
		expect(numberComparator(-Infinity, Infinity)).toBe(-1);
	});
});

describe(booleanComparator, () => {
	it('orders false before true', () => {
		expect(booleanComparator(false, true)).toBe(-1);
		expect(booleanComparator(true, false)).toBe(1);
		expect(booleanComparator(true, true)).toBe(0);
	});
});

describe(dateComparator, () => {
	it('orders based on timestamps and handles invalid dates', () => {
		const earlier = new Date('2020-01-01T00:00:00.000Z');
		const later = new Date('2021-01-01T00:00:00.000Z');
		const invalidA = new Date('invalid');
		const invalidB = new Date('invalid');

		expect(dateComparator(earlier, later)).toBeLessThan(0);
		expect(dateComparator(later, earlier)).toBeGreaterThan(0);
		expect(dateComparator(earlier, earlier)).toBe(0);
		expect(dateComparator(invalidA, later)).toBe(1);
		expect(dateComparator(later, invalidA)).toBe(-1);
		expect(dateComparator(invalidA, invalidB)).toBe(0);
	});
});

describe(by, () => {
	it('defaults to ascending order using natural comparison', () => {
		type Item = { value: number };
		const comparator = by<Item, number>((item) => item.value);
		const a = { value: 1 };
		const b = { value: 2 };

		expect(comparator(a, b)).toBe(-1);
		expect(comparator(b, a)).toBe(1);
	});

	it('supports descending order by reversing the underlying comparator', () => {
		type Item = { value: number };
		const base = vi.fn((a: number, b: number) => a - b);
		const comparator = by<Item, number>((item) => item.value, {
			compare: base,
			direction: 'desc',
		});

		const a = { value: 1 };
		const b = { value: 2 };

		expect(comparator(a, b)).toBe(1);
		expect(base).toHaveBeenCalledWith(2, 1);
	});

	it('delegates to a custom comparator for derived keys', () => {
		type Item = { label: string };
		const custom = vi.fn((a: string, b: string) => a.length - b.length);
		const comparator = by<Item, string>((item) => item.label, {
			compare: custom,
		});

		const a = { label: 'hi' };
		const b = { label: 'there' };

		expect(comparator(a, b)).toBeLessThan(0);
		expect(custom).toHaveBeenCalledWith('hi', 'there');
	});

	it('accepts a direction in place of options', () => {
		type Item = { value: number | null };
		const values = [{ value: 1 }, { value: null }, { value: 3 }];
		const sortedBy = (comparator: (a: Item, b: Item) => number) =>
			values
				.slice()
				.sort(comparator)
				.map((item) => item.value);

		expect(sortedBy(by((item: Item) => item.value, 'desc'))).toEqual([
			3,
			1,
			null,
		]);
		expect(sortedBy(by((item: Item) => item.value, 'asc'))).toEqual([
			1,
			3,
			null,
		]);
	});

	it('puts the value that passes the predicate first, and compares keys only when both pass', () => {
		type Item = { label: string; active: boolean };
		const key = vi.fn((item: Item) => item.label);
		const base = vi.fn((a: string, b: string) => a.localeCompare(b));
		const predicate = vi.fn((item: Item) => item.active);

		const comparator = by(key, { compare: base, predicate });

		const active = { label: 'able', active: true };
		const inactive = { label: 'baker', active: false };
		const otherActive = { label: 'charlie', active: true };

		expect(comparator(active, inactive)).toBe(-1);
		expect(predicate).toHaveBeenNthCalledWith(1, active);
		expect(predicate).toHaveBeenNthCalledWith(2, inactive);
		expect(key).not.toHaveBeenCalled();
		expect(base).not.toHaveBeenCalled();

		expect(comparator(active, otherActive)).toBeLessThan(0);
		expect(predicate).toHaveBeenNthCalledWith(3, active);
		expect(predicate).toHaveBeenNthCalledWith(4, otherActive);
		expect(key).toHaveBeenCalledTimes(2);
		expect(base).toHaveBeenCalledTimes(1);
		expect(base).toHaveBeenLastCalledWith('able', 'charlie');
	});
});

describe(order, () => {
	it('returns 0 when no comparators are provided', () => {
		const comparator = order<number>();
		expect(comparator(1, 2)).toBe(0);
	});

	it('short-circuits once a comparator returns a non-zero result', () => {
		const first = vi.fn(() => -1);
		const second = vi.fn(() => 1);
		const comparator = order(first, second);

		expect(comparator('a', 'b')).toBe(-1);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});

	it('falls through to later comparators when earlier ones tie', () => {
		const first = vi.fn(() => 0);
		const second = vi.fn(() => 1);
		const comparator = order(first, second);

		expect(comparator('a', 'b')).toBe(1);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('treats a NaN result as a tie and continues to the next comparator', () => {
		const comparator = order<number>(
			() => Number.NaN,
			(a, b) => a - b,
		);
		expect(comparator(1, 2)).toBe(-1);
	});
});

describe(map, () => {
	it('compares derived values using the provided mapper', () => {
		type Item = { score: number };
		const comparator = map<Item, number>((item) => item.score);

		const a = { score: 1 };
		const b = { score: 3 };

		expect(comparator(a, b)).toBe(-1);
	});

	it('supports custom comparators and mapper call tracking', () => {
		type Item = { label: string };
		const mapper = vi.fn((item: Item) => item.label);
		const base = vi.fn((a: string, b: string) => a.localeCompare(b));
		const comparator = map(mapper, base);

		const a = { label: 'beta' };
		const b = { label: 'alpha' };

		expect(comparator(a, b)).toBeGreaterThan(0);
		expect(mapper).toHaveBeenNthCalledWith(1, a);
		expect(mapper).toHaveBeenNthCalledWith(2, b);
		expect(base).toHaveBeenCalledWith('beta', 'alpha');
	});
});

describe(when, () => {
	it('puts the value that passes first, and ties values that both fail', () => {
		const withinBucket = when<string>(
			(value) => value.startsWith('x'),
			compare,
		);
		const fallback = order(withinBucket, compare);

		expect(withinBucket('xylophone', 'apple')).toBe(-1);
		expect(withinBucket('apple', 'xylophone')).toBe(1);
		expect(withinBucket('apple', 'banana')).toBe(0);
		expect(fallback('apple', 'banana')).toBeLessThan(0);
		expect(['banana', 'xylophone', 'apple', 'xray'].sort(fallback)).toEqual(
			['xray', 'xylophone', 'apple', 'banana'],
		);
	});

	it('delegates to the comparator only when both values satisfy the predicate', () => {
		const base = vi.fn(compare<number>);
		const comparator = when<number>((value) => value % 2 === 0, base);

		expect(comparator(2, 4)).toBe(-1);
		expect(base).toHaveBeenCalledWith(2, 4);

		base.mockClear();
		expect(comparator(2, 3)).toBe(-1);
		expect(comparator(3, 5)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});
});
