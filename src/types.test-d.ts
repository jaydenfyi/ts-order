import type { KeyOptions } from './types.js';
import { describe, expectTypeOf, it } from 'vitest';
import { by, compare, map } from './comparator/index.js';
import { Order } from './order.js';

type User = {
	name: string;
	age: number | undefined;
	lastLogin: Date | null;
	address: { city: string };
};

describe('default-compare keys', () => {
	it('rejects an object key without compare', () => {
		// @ts-expect-error an object key needs a compare option
		Order.by((user: User) => user.address);
		// @ts-expect-error an object key needs a compare option
		new Order<User>().by((user) => user.address);
		// @ts-expect-error an object key needs a compare option
		by((user: User) => user.address);
		// @ts-expect-error an object key needs a comparator
		map((user: User) => user.address);
		// @ts-expect-error compare accepts only Comparable values
		compare({ city: 'a' }, { city: 'b' });
	});

	it('accepts an object key with compare', () => {
		const byCity = (a: { city: string }, b: { city: string }) => a.city.localeCompare(b.city);
		expectTypeOf(Order.by((user: User) => user.address, { compare: byCity })).toEqualTypeOf<Order<User>>();
		expectTypeOf(new Order<User>().by((user) => user.address, { compare: byCity })).toEqualTypeOf<Order<User>>();
		expectTypeOf(by((user: User) => user.address, { compare: byCity })).toBeFunction();
		expectTypeOf(map((user: User) => user.address, byCity)).toBeFunction();
	});

	it('accepts an object whose valueOf() returns a number or a bigint', () => {
		class Money {
			constructor(readonly cents: number) {}
			valueOf() {
				return this.cents;
			}
		}
		type Instant = { valueOf: () => bigint };
		expectTypeOf(Order.by((money: Money) => money)).toEqualTypeOf<Order<Money>>();
		expectTypeOf(Order.by((instant: Instant) => instant)).toEqualTypeOf<Order<Instant>>();
		expectTypeOf(by((money: Money) => money)).toBeFunction();
		expectTypeOf(map((money: Money) => money)).toBeFunction();
		expectTypeOf(compare(new Money(1), new Money(2))).toBeNumber();
	});

	it('rejects an object whose valueOf() returns a string, and keys that are arrays', () => {
		type Decimal = { valueOf: () => string };
		// @ts-expect-error `<` would compare the strings, so "10" sorts before "9"
		Order.by((decimal: Decimal) => decimal);
		// @ts-expect-error an array key needs a compare option
		Order.by((values: number[]) => values);
	});

	it('accepts keys that can be missing', () => {
		expectTypeOf(Order.by((user: User) => user.age)).toEqualTypeOf<Order<User>>();
		expectTypeOf(Order.by((user: User) => user.lastLogin)).toEqualTypeOf<Order<User>>();
		expectTypeOf(by((user: User) => user.age)).toBeFunction();
	});

	it('infers the key type for the compare parameters', () => {
		Order.by((user: User) => user.name, {
			compare: (a, b) => {
				expectTypeOf(a).toEqualTypeOf<string>();
				return a.localeCompare(b);
			},
		});
		by((user: User) => user.name, {
			compare: (a, b) => {
				expectTypeOf(b).toEqualTypeOf<string>();
				return a.localeCompare(b);
			},
		});
	});
});

describe('options', () => {
	it('accepts explicit undefined values under exactOptionalPropertyTypes', () => {
		const options: KeyOptions<string, User> = {
			direction: undefined,
			compare: undefined,
			predicate: undefined,
			nulls: undefined,
		};
		Order.by((user: User) => user.name, options);
		Order.by((user: User) => user.name, { direction: undefined });
		by((user: User) => user.name, { nulls: undefined });
	});
});
