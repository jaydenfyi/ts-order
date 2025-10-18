import { describe, expect, it, vi } from 'vitest';
import {
	boolean as booleanComparator,
	by,
	compare,
	date as dateComparator,
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
} from './index';

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
		expect(numberComparator(3, 1)).toBe(2);
		expect(numberComparator(Number.NaN, Number.NaN)).toBe(0);
		expect(numberComparator(Number.NaN, 5)).toBe(-1);
		expect(numberComparator(5, Number.NaN)).toBe(1);
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
		expect(dateComparator(invalidA, later)).toBe(-1);
		expect(dateComparator(later, invalidA)).toBe(1);
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
	it('returns 0 when only one value matches and relies on follow-up comparators', () => {
		const withinBucket = when<string>(
			(value) => value.startsWith('x'),
			compare,
		);
		const fallback = order(withinBucket, compare);

		expect(withinBucket('xylophone', 'apple')).toBe(0);
		expect(withinBucket('apple', 'xylophone')).toBe(0);
		expect(fallback('xylophone', 'apple')).toBeGreaterThan(0);
		expect(fallback('apple', 'xylophone')).toBeLessThan(0);
		expect(fallback('apple', 'banana')).toBeLessThan(0);
	});

	it('delegates to the comparator only when both values satisfy the predicate', () => {
		const base = vi.fn(compare<number>);
		const comparator = when<number>((value) => value % 2 === 0, base);

		expect(comparator(2, 4)).toBe(-1);
		expect(base).toHaveBeenCalledWith(2, 4);

		base.mockClear();
		expect(comparator(2, 3)).toBe(0);
		expect(base).not.toHaveBeenCalled();
	});
});
