// The README examples, checked by the type checker. Keep in sync with README.md.
import type { Comparator } from './types.js';
import { describe, expectTypeOf, it } from 'vitest';
import {
	A_AFTER_B,
	A_BEFORE_B,
	boolean,
	by,
	compare,
	date,
	EQUAL,
	localeString,
	map,
	nansFirst,
	nansLast,
	nullsLast,
	number,
	order,
	reverse,
	when,
} from './comparator/index.js';
import { P } from 'ts-pattern';
import { Order } from './index.js';
import { match } from './match.js';

interface User {
	id: number;
	isActive: boolean;
	firstName: string;
	lastName: string;
	age: number | null;
	createdAt: Date;
	region: 'eu' | 'us';
	score: number | null;
}
interface Item {
	expiresAt: Date;
	score: number;
	label: string;
	nested: { score: number };
}
interface Address {
	city: string;
	postcode: string;
}
interface Customer {
	id: number;
	address: Address;
}
interface Staff {
	name: string;
	role: string;
	team: string;
	isActive: boolean;
}

declare const users: User[];
declare const items: Item[];

describe('README examples', () => {
	it('quickstart', () => {
		const byActiveAndName = new Order<User>()
			.by((u) => u.isActive, { direction: 'desc' })
			.by((u) => u.lastName)
			.by((u) => u.firstName)
			.by((u) => u.id);
		expectTypeOf(byActiveAndName.sort(users)).toEqualTypeOf<User[]>();
		expectTypeOf(users.slice().sort(byActiveAndName.compare)).toEqualTypeOf<
			User[]
		>();
	});

	it('order.by', () => {
		Order.by((u: User) => u.age);
		const collator = new Intl.Collator('en');
		new Order<User>()
			.by((u) => u.lastName, {
				direction: 'desc',
				compare: collator.compare,
			})
			.by((u) => u.age, { nulls: 'first' });
		Order.by((i: Item) => i.expiresAt, {
			compare: (a, b) => a.getTime() - b.getTime(),
		});
		Order.by((c: Customer) => c.address, {
			compare: (a, b) => a.city.localeCompare(b.city),
		});
		new Order<User>()
			.by((u) => u.age, { predicate: (u) => u.age != null })
			.by((u) => u.lastName);
		new Order<User>().by((u) => u.createdAt).by((u) => u.id);
	});

	it('reverse, map, when, compare, sort', () => {
		Order.by((u: User) => u.createdAt).reverse();
		const byAddress = Order.by((a: Address) => a.city).by(
			(a) => a.postcode,
		);
		Order.map((c: Customer) => c.address, byAddress);
		new Order<Customer>().by((c) => c.id).map((c) => c.address, byAddress);
		new Order<User>()
			.by((u) => u.region)
			.when(
				(u) => u.region === 'eu',
				Order.by((u) => u.score, { direction: 'desc' }),
			)
			.by((u) => u.id);
		items.sort(
			Order.by((i: Item) => i.score, { direction: 'desc' }).compare,
		);
		const byName = Order.by((u: User) => u.lastName);
		Order.sort(users, byName);
		byName.sort(users);
	});

	it('reusing orders across types', () => {
		const byName = <T extends { name: string }>() =>
			Order.by((x: T) => x.name);
		const byRoleThenName = new Order<Staff>([
			Order.by((s: Staff) => s.role),
			byName<Staff>(),
		]);
		expectTypeOf(byRoleThenName).toEqualTypeOf<Order<Staff>>();
		Order.by((s: Staff) => s.team).when((s) => s.isActive, byName());
		// @ts-expect-error Customer has no name
		byName<Customer>();
	});

	it('comparators', () => {
		['b', 'a', 'c'].sort(compare);
		[2, null, 1].sort(compare);
		([1, 2, null] as (number | null)[]).sort(nullsLast(number));
		[Number.NaN, 2, 1].sort(nansLast(number));
		[3, Number.NaN, 1].sort(nansFirst(number));
		[3, 1].sort(number);
		['b', 'a'].sort(localeString);
		[true, false].sort(boolean);
		[new Date()].sort(date);
		['file10', 'file2'].sort(
			new Intl.Collator(undefined, { numeric: true }).compare,
		);
		items.sort(by((item) => item.label));
		users.sort(
			order(
				by((u) => u.lastName),
				by((u) => u.firstName),
			),
		);
		items.sort(map((item) => item.nested.score));
		[new Date()].sort(reverse(date));
		const evenNumbersFirst = order<number>(
			when((value) => value % 2 === 0, number),
			number,
		);
		[3, 2, 1, 4].sort(evenNumbersFirst);
		const shortFirst: Comparator<string> = (a, b) =>
			a.length < b.length
				? A_BEFORE_B
				: a.length > b.length
					? A_AFTER_B
					: EQUAL;
		['aa', 'b'].sort(shortFirst);
	});

	it('ts-order/match', () => {
		type Circle = { kind: 'circle'; id: number; radius: number };
		type Shape =
			| { kind: 'square'; id: number; side: number }
			| Circle
			| { kind: 'triangle'; id: number };

		const byRadius = Order.by((c: { radius: number }) => c.radius);

		const byShape = match<Shape>()
			.with({ kind: 'square' }, (o) =>
				o.by((s) => s.side, { direction: 'desc' }),
			)
			.with({ kind: 'circle', radius: P.number.gt(10) })
			.with({ kind: 'circle' }, byRadius)
			.with({ kind: 'triangle' })
			.exhaustive()
			.by((s) => s.id);
		expectTypeOf(byShape).toEqualTypeOf<Order<Shape>>();

		match<Shape>()
			.with({ kind: 'square' })
			.with({ kind: 'circle', radius: P.number.gt(10) })
			// @ts-expect-error a case that only tests a value leaves circles uncovered
			.exhaustive();
		match<Shape>()
			.with(
				{ kind: 'circle' },
				Order.by((c: Circle) => c.radius),
			)
			.otherwise();
		type Task = {
			id: number;
			title: string;
			status: 'open' | 'blocked' | 'failed' | 'done';
			assignee: { name: string } | null;
			due: Date | null;
			tags: string[];
		};
		const byTriage = match<Task>()
			.with({ status: P.union('blocked', 'failed') }, (o) =>
				o.by((t) => t.status),
			)
			.with(
				{
					tags: P.when((tags) => tags.includes('urgent')),
					due: P.instanceOf(Date),
				},
				(o) =>
					o.by((t) => {
						expectTypeOf(t.due).toEqualTypeOf<Date>();
						return t.due;
					}),
			)
			.with({ title: P.string.startsWith('[bug]') })
			.with({ assignee: P.nullish, status: P.not('done') })
			.otherwise()
			.by((t) => t.id);
		expectTypeOf(byTriage).toEqualTypeOf<Order<Task>>();

		match(Order.by((s: Shape) => s.kind))
			.when((s) => s.id > 10)
			.otherwise();
	});

	it('migration notes', () => {
		Order.by((u: User) => u.score, { predicate: (u) => u.score != null });
		Order.by((x: { v?: number }) => x.v).sort([{ v: 3 }, {}, { v: 1 }]);
		const byValue = Order.by((x: number) => x, {
			compare: (a, b) => a - b,
		});
		byValue.compare(Infinity, Infinity);
		// @ts-expect-error an object key needs a compare option
		Order.by((c: Customer) => c.address);
	});
});
