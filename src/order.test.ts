import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { number } from './comparator/index.js';
import { Order } from './order.js';
import { distinctSorts, permutations } from './testing.js';

type Role = 'admin' | 'manager' | 'staff' | 'guest';

type Address = {
	city: string;
	street: string;
	postcode: string;
};

type User = {
	id: number;
	firstName: string;
	lastName: string;
	age: number | null;
	isActive: boolean;
	role: Role;
	createdAt: Date;
	address: Address;
};

type Shape = {
	area: number;
};

type Triangle = Shape & {
	base: number;
	height: number;
};

const ROLE_RANK: Record<Role, number> = {
	admin: 0,
	manager: 1,
	staff: 2,
	guest: 3,
};

function compareNumberNullsLast(a: number | null, b: number | null): number {
	const aNull = a == null;
	const bNull = b == null;
	if (aNull && bNull) return 0;
	if (aNull) return 1;
	if (bNull) return -1;
	if (a! < b!) return -1;
	if (a! > b!) return 1;
	return 0;
}

function caseInsensitiveCompare(a: string, b: string): number {
	const A = a.toLocaleLowerCase();
	const B = b.toLocaleLowerCase();
	if (A < B) return -1;
	if (A > B) return 1;
	return 0;
}

function makeUser(overrides: Partial<User> & { id: number }): User {
	const base: User = {
		id: overrides.id,
		firstName: 'Ada',
		lastName: 'Lovelace',
		age: 30,
		isActive: true,
		role: 'guest',
		createdAt: new Date('2020-01-01T00:00:00.000Z'),
		address: {
			city: 'Perth',
			street: 'Main St',
			postcode: '6000',
		},
	};
	return {
		...base,
		...overrides,
		address: {
			...base.address,
			...overrides.address,
		},
	};
}

describe('Order constructor', () => {
	it('creates an empty order when called with no arguments', () => {
		const order = new Order();
		expect(order).toBeInstanceOf(Order);
		expectTypeOf(order).toEqualTypeOf<Order<unknown>>();
	});

	it('creates an empty order when called with null or undefined', () => {
		const orderFromNull = new Order(null);
		const orderFromUndefined = new Order(undefined);

		expect(orderFromNull).toBeInstanceOf(Order);
		expectTypeOf(orderFromNull).toEqualTypeOf<Order<unknown>>();

		expect(orderFromUndefined).toBeInstanceOf(Order);
		expectTypeOf(orderFromUndefined).toEqualTypeOf<Order<unknown>>();
	});

	it('creates a new Order instance when recieving an existing Order', () => {
		type Item = { value: number; label: string };
		const original = Order.by<Item, number>((item) => item.value).by(
			(item) => item.label,
			{ direction: 'desc' },
		);

		const clone = new Order(original);

		expect(clone).toBeInstanceOf(Order);
		expect(clone).not.toBe(original);
	});

	it('merges multiple Orders when constructed from an iterable', () => {
		type Item = { value: number; label: string };
		const first = Order.by<Item, number>((item) => item.value);
		const second = new Order<Item>(); // skipped
		const third = Order.by<Item, string>((item) => item.label, {
			direction: 'desc',
		});

		const composed = new Order([first, null, second, undefined, third]);

		expect(composed).toBeInstanceOf(Order);

		const a = { value: 1, label: 'alpha' };
		const b = { value: 1, label: 'beta' };
		const c = { value: 2, label: 'aardvark' };

		expect(composed.compare(a, b)).toBeGreaterThan(0);
		expect(composed.compare(a, c)).toBeLessThan(0);
	});

	it('combines orders from another copy of the package', async () => {
		vi.resetModules();
		const { Order: OtherOrder } = await import('./order.js');
		expect(OtherOrder).not.toBe(Order);

		type Item = { value: number; label: string };
		const byValue = OtherOrder.by((item: Item) => item.value);
		const byLabel = Order.by((item: Item) => item.label);
		const items: Item[] = [
			{ value: 2, label: 'a' },
			{ value: 1, label: 'b' },
			{ value: 1, label: 'a' },
		];
		const expected = [
			{ value: 1, label: 'a' },
			{ value: 1, label: 'b' },
			{ value: 2, label: 'a' },
		];

		expect(new Order<Item>(byValue).by((item) => item.label).sort(items)).toEqual(expected);
		expect(new Order<Item>([byValue, byLabel]).sort(items)).toEqual(expected);
		expect(Order.map((item: Item) => item, byValue).by((item) => item.label).sort(items)).toEqual(expected);
		expect(byLabel.reverse().when(() => true, byValue).reverse().sort(items)).toEqual([
			{ value: 2, label: 'a' },
			{ value: 1, label: 'a' },
			{ value: 1, label: 'b' },
		]);
	});
});

describe('Order.compare', () => {
	it('returns the same comparator on every access', () => {
		const order = Order.by((value: number) => value);
		expect(order.compare).toBe(order.compare);
	});

	it('returns 0 when no steps are defined', () => {
		const order = new Order<any>();
		expect(order.compare({ foo: 1 }, { foo: 2 })).toBe(0);
		expect(order.compare({ foo: 1 }, { foo: 1 })).toBe(0);
	});

	it('sorts ascending by default using natural comparison', () => {
		type Item = { value: number };
		const order = Order.by<Item, number>((item) => item.value);
		const a = { value: 1 };
		const b = { value: 2 };

		expect(order.compare(a, b)).toBe(-1);
		expect(order.compare(b, a)).toBe(1);
		expect(order.compare(a, { value: 1 })).toBe(0);
	});

	it('respects explicit descending direction for natural comparisons', () => {
		type Item = { value: number };
		const order = Order.by<Item, number>((item) => item.value, {
			direction: 'desc',
		});

		const a = { value: 1 };
		const b = { value: 2 };

		expect(order.compare(a, b)).toBe(1);
		expect(order.compare(b, a)).toBe(-1);
		expect(order.compare(a, { value: 1 })).toBe(0);
	});

	it('delegates to the custom comparator and normalizes its result sign', () => {
		type Item = { score: number };
		const comparator = vi.fn(() => 42);
		const order = Order.by<Item, number>((item) => item.score, {
			direction: 'desc',
			compare: comparator,
		});

		const a = { score: 1 };
		const b = { score: 2 };

		expect(order.compare(a, b)).toBe(-1);
		expect(comparator).toHaveBeenCalledWith(1, 2);

		comparator.mockReturnValueOnce(-7);
		expect(order.compare(a, b)).toBe(1);
	});

	it('falls through to subsequent steps when earlier ones tie', () => {
		type Item = { primary: number; secondary: string };
		const order = Order.by<Item, number>((item) => item.primary).by(
			(item) => item.secondary,
		);

		const first = { primary: 1, secondary: 'alpha' };
		const second = { primary: 1, secondary: 'beta' };
		const third = { primary: 2, secondary: 'aardvark' };

		expect(order.compare(first, second)).toBeLessThan(0);
		expect(order.compare(second, first)).toBeGreaterThan(0);
		expect(order.compare(first, third)).toBeLessThan(0);
		expect(order.compare(first, first)).toBe(0);
	});

	it('puts the item that passes a step predicate first', () => {
		type Item = { score: number | null; fallback: number };
		const keyed = vi.fn((item: Item) => item.score!);
		const fallback = vi.fn((item: Item) => item.fallback);
		const order = Order.by<Item, number>(keyed, {
			predicate: (item) => item.score != null,
		}).by(fallback);

		const missing = { score: null, fallback: 0 };
		const present = { score: 10, fallback: 1 };

		expect(order.compare(missing, present)).toBe(1);
		expect(order.compare(present, missing)).toBe(-1);
		expect(keyed).not.toHaveBeenCalled();
		expect(fallback).not.toHaveBeenCalled();
	});
	it('does not mutate the original order when chaining with by()', () => {
		type Item = { primary: number; secondary: number };
		const base = Order.by<Item, number>((item) => item.primary);
		const extended = base.by((item) => item.secondary);

		const a = { primary: 1, secondary: 5 };
		const b = { primary: 1, secondary: 2 };

		expect(base.compare(a, b)).toBe(0);
		expect(extended.compare(a, b)).toBeGreaterThan(0);
	});
});

describe('order constructors and cloning', () => {
	it('copies steps when constructed from another order', () => {
		type Item = { value: number; label: string };
		const original = Order.by<Item, number>((item) => item.value).by(
			(item) => item.label,
			{ direction: 'desc' },
		);

		const clone = new Order(original);

		const a = { value: 1, label: 'alpha' };
		const b = { value: 1, label: 'beta' };

		expect(clone.compare(a, b)).toBe(original.compare(a, b));
	});

	it('merges iterable sources, skipping empty ones', () => {
		type Item = { value: number; label: string };
		const first = Order.by<Item, number>((item) => item.value);
		const second = new Order<Item>(); // skipped
		const third = Order.by<Item, string>((item) => item.label, {
			direction: 'desc',
		});

		const composed = new Order<Item>([
			first,
			null,
			second,
			undefined,
			third,
		]);

		const a = { value: 1, label: 'alpha' };
		const b = { value: 1, label: 'beta' };
		const c = { value: 2, label: 'aardvark' };

		expect(composed.compare(a, b)).toBeGreaterThan(0);
		expect(composed.compare(a, c)).toBeLessThan(0);
	});
});

describe('Order.reverse', () => {
	it('flips all step directions via the static helper', () => {
		type Item = { value: number; label: string };
		const order = Order.by<Item, number>((item) => item.value).by(
			(item) => item.label,
			{ direction: 'desc' },
		);
		const reversed = Order.reverse(order);

		const a = { value: 1, label: 'alpha' };
		const b = { value: 2, label: 'beta' };
		const tieA = { value: 2, label: 'zeta' };
		const tieB = { value: 2, label: 'beta' };

		expect(reversed.compare(a, b)).toBeGreaterThan(0);
		expect(reversed.compare(b, a)).toBeLessThan(0);

		const originalTie = order.compare(tieA, tieB);
		const reversedTie = reversed.compare(tieA, tieB);
		expect(reversedTie).toBe(-originalTie);
	});

	it('produces equivalent results via the instance helper', () => {
		type Item = { value: number };
		const order = Order.by<Item, number>((item) => item.value);
		const reversedStatic = Order.reverse(order);
		const reversedInstance = order.reverse();

		const a = { value: 1 };
		const b = { value: 3 };

		expect(reversedInstance.compare(a, b)).toBe(
			reversedStatic.compare(a, b),
		);
		expect(reversedInstance.compare(a, b)).toBeGreaterThan(0);
	});
});

describe('Order.map', () => {
	it('returns an empty order when the sub-order has no steps', () => {
		const mapped = Order.map<{ value: number }, { nested: number }>(
			(item) => ({ nested: item.value }),
			new Order<{ nested: number }>(),
		);

		expect(mapped.compare({ value: 1 }, { value: 9 })).toBe(0);
	});

	it('applies nested selectors when the sub-order has steps', () => {
		const subOrder = Order.by<Address, string>(
			(address) => address.city,
		).by((address) => address.street);
		const mapped = Order.map<User, Address>(
			(user) => user.address,
			subOrder,
		);

		const perth = makeUser({
			id: 1,
			address: { city: 'Perth', street: 'Main St', postcode: '6000' },
		});
		const sydney = makeUser({
			id: 2,
			address: { city: 'Sydney', street: 'High St', postcode: '2000' },
		});

		expect(mapped.compare(perth, sydney)).toBeLessThan(0);
		expect(mapped.compare(sydney, perth)).toBeGreaterThan(0);
	});

	it('applies predicates of the sub-order to the mapped value', () => {
		type Place = { city: string; visible: boolean };
		type Item = { id: number; place: Place };
		const byCity = Order.by((place: Place) => place.city, { predicate: (place) => place.visible });
		const items: Item[] = [
			{ id: 1, place: { city: 'a', visible: false } },
			{ id: 2, place: { city: 'c', visible: true } },
			{ id: 3, place: { city: 'b', visible: true } },
		];

		const sorted = Order.map((item: Item) => item.place, byCity).sort(items);
		expect(sorted.map((item) => item.id)).toEqual([3, 2, 1]);
	});

	it('preserves existing steps when using the instance .map()', () => {
		const addressOrder = Order.by<Address, string>(
			(address) => address.city,
			{
				compare: caseInsensitiveCompare,
			},
		)
			.by((address) => address.street, {
				compare: caseInsensitiveCompare,
			})
			.by((address) => address.postcode);

		const base = Order.by<User, number>((user) => ROLE_RANK[user.role]);
		const combined = base.map((user) => user.address, addressOrder);

		const managerPerth = makeUser({
			id: 1,
			role: 'manager',
			address: { city: 'Perth', street: 'Main', postcode: '6000' },
		});
		const managerSydney = makeUser({
			id: 2,
			role: 'manager',
			address: { city: 'Sydney', street: 'Main', postcode: '2000' },
		});
		const adminSydney = makeUser({
			id: 3,
			role: 'admin',
			address: { city: 'Sydney', street: 'Main', postcode: '2000' },
		});

		// Primary sort by role rank
		expect(combined.compare(adminSydney, managerPerth)).toBeLessThan(0);
		// Within the same role, fall back to the mapped steps
		expect(combined.compare(managerPerth, managerSydney)).toBeLessThan(0);
	});
});

describe('Order.sort', () => {
	it('returns a shallow copy when the array length is <= 1', () => {
		const order = Order.by<number, number>((value) => value);
		const singleton = [42];
		const empty: number[] = [];

		const singletonResult = Order.sort(singleton, order);
		const emptyResult = Order.sort(empty, order);

		expect(singletonResult).toEqual([42]);
		expect(singletonResult).not.toBe(singleton);
		expect(emptyResult).toEqual([]);
		expect(emptyResult).not.toBe(empty);
	});

	it('returns a copy when there are no steps', () => {
		const items = [{ value: 2 }, { value: 1 }];
		const original = [...items];
		const order = new Order<(typeof items)[number]>();

		const result = Order.sort(items, order);
		expect(result).toEqual(items);
		expect(result).not.toBe(items);
		expect(items).toEqual(original);
	});

	it('sorts numbers ascending by default', () => {
		const items = [5, 1, 4, 3, 2];
		const order = Order.by<number, number>((value) => value);

		const result = Order.sort(items, order);

		expect(result).toStrictEqual([1, 2, 3, 4, 5]);
		expect(result).not.toBe(items);
		expect(items).toEqual([5, 1, 4, 3, 2]);
	});

	it('sorts numbers descending when requested', () => {
		const items = [5, 1, 4, 3, 2];
		const order = Order.by<number, number>((value) => value, {
			direction: 'desc',
		});

		const expected = items.slice().sort(order.compare);
		const result = Order.sort(items, order);

		expect(result).toEqual(expected);
	});

	it('sorts complex objects with multiple steps and custom comparators', () => {
		const users = [
			makeUser({
				id: 1,
				firstName: 'ada',
				lastName: 'Lovelace',
				role: 'manager',
				age: 40,
				createdAt: new Date('2020-01-02'),
				isActive: true,
			}),
			makeUser({
				id: 2,
				firstName: 'Grace',
				lastName: 'hopper',
				role: 'staff',
				age: null,
				createdAt: new Date('2019-12-31'),
				isActive: false,
			}),
			makeUser({
				id: 3,
				firstName: 'Barbara',
				lastName: 'Liskov',
				role: 'manager',
				age: 34,
				createdAt: new Date('2020-01-01'),
				isActive: false,
			}),
			makeUser({
				id: 4,
				firstName: 'barbara',
				lastName: 'liskov',
				role: 'manager',
				age: null,
				createdAt: new Date('2020-01-01'),
				isActive: true,
			}),
		];

		const order = Order.by<User, string>((user) => user.lastName, {
			compare: caseInsensitiveCompare,
		})
			.by((user) => user.firstName, { compare: caseInsensitiveCompare })
			.by((user) => user.isActive, { direction: 'desc' })
			.by((user) => ROLE_RANK[user.role])
			.by((user) => user.createdAt.getTime())
			.by((user) => user.age, { compare: compareNumberNullsLast });

		const expected = users.slice().sort(order.compare);
		const result = Order.sort(users, order);

		expect(result).toEqual(expected);
		expect(users.map((u) => u.id)).toEqual([1, 2, 3, 4]);
	});

	it('precomputes keys exactly once per element per step', () => {
		type Item = { primary: number; secondary: number };
		const first = vi.fn((item: Item) => item.primary);
		const second = vi.fn((item: Item) => item.secondary);

		const order = Order.by<Item, number>(first).by(second);
		const items: Item[] = [
			{ primary: 2, secondary: 1 },
			{ primary: 1, secondary: 9 },
			{ primary: 2, secondary: 0 },
		];

		Order.sort(items, order);

		expect(first).toHaveBeenCalledTimes(items.length);
		expect(second).toHaveBeenCalledTimes(items.length);
	});

	it('does not pass the keys of items that fail a predicate to a custom comparator', () => {
		type Item = { name: string; active: boolean };
		const custom = vi.fn((a: string, b: string) => a.localeCompare(b));
		const items: Item[] = [
			{ name: 'b', active: false },
			{ name: 'a', active: true },
			{ name: 'c', active: false },
		];
		const byName = Order.by((item: Item) => item.name, {
			compare: custom,
			predicate: (item) => item.active,
		});

		expect(byName.sort(items).map((item) => item.name)).toEqual(['a', 'b', 'c']);
		expect(custom).not.toHaveBeenCalled();
	});

	it('sorts items that pass a step predicate first, and keeps the input order of the rest', () => {
		type Item = { id: number; score: number | null };
		const key = vi.fn((item: Item) => item.score!);
		const order = Order.by<Item, number>(key, {
			predicate: (item) => item.score != null,
		});
		const items: Item[] = [
			{ id: 1, score: null },
			{ id: 2, score: 10 },
			{ id: 3, score: 5 },
			{ id: 4, score: null },
		];

		expect(order.compare(items[2]!, items[1]!)).toBeLessThan(0);
		key.mockClear();
		const result = Order.sort(items, order);

		expect(key).toHaveBeenCalledTimes(2);
		expect(result.map((item) => item.id)).toEqual([3, 2, 1, 4]);
		expect(result.filter((item) => item.score == null)).toStrictEqual([
			items[0],
			items[3],
		]);
		expect(result.filter((item) => item.score != null)).toStrictEqual([
			items[2],
			items[1],
		]);
	});

	it('preserves the input array element type when sorting with a wider order', () => {
		const order = Order.by<Shape, number>((shape) => shape.area);
		const triangles: Triangle[] = [
			{ area: 6, base: 3, height: 4 },
			{ area: 3, base: 2, height: 3 },
		];

		const result = Order.sort(triangles, order);

		expectTypeOf(result).toEqualTypeOf<Triangle[]>();
		expect(result).toEqual([
			{ area: 3, base: 2, height: 3 },
			{ area: 6, base: 3, height: 4 },
		]);
	});
});

describe('Order#sort', () => {
	it('returns a sorted copy and matches the static helper', () => {
		const order = Order.by<number, number>((value) => value);
		const items = [3, 1, 2];

		const result = order.sort(items);

		expect(result).toEqual([1, 2, 3]);
		expect(result).toEqual(Order.sort(items, order));
		expect(result).not.toBe(items);
		expect(items).toEqual([3, 1, 2]);
	});

	it('preserves the input array element type when sorting through a wider order', () => {
		const order = Order.by<Shape, number>((shape) => shape.area);
		const triangles: Triangle[] = [
			{ area: 6, base: 3, height: 4 },
			{ area: 3, base: 2, height: 3 },
		];

		const result = order.sort(triangles);

		expectTypeOf(result).toEqualTypeOf<Triangle[]>();
		expect(result).toEqual([
			{ area: 3, base: 2, height: 3 },
			{ area: 6, base: 3, height: 4 },
		]);
	});
});

describe('Order.when', () => {
	it('conjoins step predicates with the guard predicate via static helper', () => {
		type Item = { score: number; enabled: boolean; region: 'eu' | 'us' };
		const key = vi.fn((item: Item) => item.score);
		const guarded = Order.when(
			(item) => item.region === 'eu',
			Order.by<Item, number>(key, {
				predicate: (item) => item.enabled,
			}),
		);

		const euOne = { score: 1, enabled: true, region: 'eu' } as const;
		const euTwo = { score: 2, enabled: true, region: 'eu' } as const;
		const us = { score: 0, enabled: true, region: 'us' } as const;
		const euDisabled = { score: 5, enabled: false, region: 'eu' } as const;

		key.mockClear();
		expect(guarded.compare(euOne, euTwo)).toBeLessThan(0);
		expect(key).toHaveBeenCalledTimes(2);

		key.mockClear();
		expect(guarded.compare(euOne, us)).toBe(-1);
		expect(guarded.compare(us, euOne)).toBe(1);
		expect(key).not.toHaveBeenCalled();

		key.mockClear();
		expect(guarded.compare(euOne, euDisabled)).toBe(-1);
		expect(key).not.toHaveBeenCalled();
	});

	it('appends a guarded order via the instance helper', () => {
		type Item = {
			region: 'eu' | 'us';
			score: number;
			enabled: boolean;
		};
		const base = Order.by<Item, string>((item) => item.region);
		const key = vi.fn((item: Item) => item.score);
		const block = Order.by<Item, number>(key, {
			predicate: (item) => item.enabled,
		});
		const combined = base.when((item) => item.region === 'eu', block);

		const euOne = { region: 'eu', score: 1, enabled: true } as const;
		const euTwo = { region: 'eu', score: 2, enabled: true } as const;
		const us = { region: 'us', score: 0, enabled: true } as const;
		const euDisabled = { region: 'eu', score: 5, enabled: false } as const;

		key.mockClear();
		expect(combined.compare(euOne, euTwo)).toBeLessThan(0);
		expect(key).toHaveBeenCalledTimes(2);

		key.mockClear();
		expect(combined.compare(euOne, us)).toBeLessThan(0);
		expect(key).not.toHaveBeenCalled();

		key.mockClear();
		expect(combined.compare(euOne, euDisabled)).toBe(-1);
		expect(key).not.toHaveBeenCalled();
	});

	it('puts items that pass the guard first, even when they fail a wrapped predicate', () => {
		type Item = { id: number; region: 'eu' | 'us'; enabled: boolean };
		const items: Item[] = [
			{ id: 1, region: 'us', enabled: true },
			{ id: 2, region: 'eu', enabled: false },
		];
		const isEu = (item: Item) => item.region === 'eu';
		const ids = (sorted: Item[]) => sorted.map((item) => item.id);

		const wrapped = Order.by((item: Item) => item.id, { predicate: (item) => item.enabled });
		expect(ids(Order.when(isEu, wrapped).sort(items))).toEqual([2, 1]);
		expect(ids(Order.when(isEu, new Order<Item>()).sort(items))).toEqual([2, 1]);
	});
});

describe('comparators that return NaN', () => {
	type Item = { id: number; value: number };
	const items: Item[] = [
		{ id: 1, value: Infinity },
		{ id: 2, value: 1 },
		{ id: 3, value: -Infinity },
		{ id: 4, value: Infinity },
		{ id: 5, value: -Infinity },
		{ id: 6, value: 0 },
	];
	// `Infinity - Infinity` is NaN, so equal infinities compare as NaN.
	const subtract = (a: number, b: number) => a - b;

	it.each(['asc', 'desc'] as const)('treat a NaN result as a tie in %s order', (direction) => {
		const order = Order.by((item: Item) => item.value, {
			compare: subtract,
			direction,
		}).by((item) => item.id);

		const viaSort = distinctSorts(items, (p) => order.sort(p));
		const viaCompare = distinctSorts(items, (p) => p.sort(order.compare));

		expect(viaSort.size).toBe(1);
		expect(viaCompare).toEqual(viaSort);
		const [a, b] = [items[0]!, items[3]!];
		expect(order.compare(a, b)).toBe(-order.compare(b, a));
	});

	it('sorts infinities with the bundled number comparator', () => {
		const order = Order.by((item: Item) => item.value, { compare: number }).by(
			(item) => item.id,
		);
		const sorts = distinctSorts(items, (p) => order.sort(p).map((item) => item.id));
		expect(sorts).toEqual(new Set([JSON.stringify([3, 5, 6, 2, 1, 4])]));
	});
});

describe('predicate steps give one consistent order', () => {
	type Item = { id: number; region: 'eu' | 'us'; score: number | null };
	const ids = (items: Item[]) => items.map((item) => item.id);

	it('sorts items that skip a null score after the scored items, from any input order', () => {
		const items: Item[] = [
			{ id: 1, region: 'eu', score: null },
			{ id: 2, region: 'eu', score: 10 },
			{ id: 3, region: 'eu', score: 5 },
			{ id: 4, region: 'eu', score: null },
		];
		const byScore = Order.by((item: Item) => item.score, {
			predicate: (item) => item.score != null,
		});

		const sorts = distinctSorts(items, (p) => ids(byScore.by((item) => item.id).sort(p)));
		expect(sorts).toEqual(new Set([JSON.stringify([3, 2, 1, 4])]));
		for (const p of permutations(items)) {
			expect(ids(byScore.sort(p)).slice(0, 2)).toEqual([3, 2]);
		}
	});

	it('does not form a cycle when a when() block is followed by a tiebreaker', () => {
		const a: Item = { id: 3, region: 'eu', score: 1 };
		const b: Item = { id: 2, region: 'us', score: 0 };
		const c: Item = { id: 1, region: 'eu', score: 2 };
		const order = new Order<Item>()
			.when((item) => item.region === 'eu', Order.by((item: Item) => item.score))
			.by((item) => item.id);

		expect(distinctSorts([a, b, c], (p) => ids(order.sort(p)))).toEqual(
			new Set([JSON.stringify([3, 1, 2])]),
		);
		expect(distinctSorts([a, b, c], (p) => ids(p.sort(order.compare)))).toEqual(
			new Set([JSON.stringify([3, 1, 2])]),
		);
	});
});
