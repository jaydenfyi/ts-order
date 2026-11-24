import { isMatching, P } from 'ts-pattern';
import { describe, expect, it } from 'vitest';
import { compile } from './compiled-order.js';
import { match } from './match.js';
import { Order } from './order.js';
import { distinctSorts } from './testing.js';

type Square = { kind: 'square'; id: number; side: number };
type Circle = { kind: 'circle'; id: number; radius: number };
type Triangle = { kind: 'triangle'; id: number; base: number };
type Shape = Square | Circle | Triangle;

const shapes: Shape[] = [
	{ kind: 'circle', id: 1, radius: 3 },
	{ kind: 'triangle', id: 2, base: 9 },
	{ kind: 'square', id: 3, side: 2 },
	{ kind: 'circle', id: 4, radius: 1 },
	{ kind: 'square', id: 5, side: 7 },
	{ kind: 'triangle', id: 6, base: 1 },
	{ kind: 'square', id: 7, side: 7 },
];

const byShape = match<Shape>()
	.with({ kind: 'square' }, (o) => o.by((s) => s.side, { direction: 'desc' }))
	.with({ kind: 'circle' }, (o) => o.by((c) => c.radius))
	.with({ kind: 'triangle' })
	.exhaustive()
	.by((s) => s.id);

/** Every way to sort with `order`, which must give the same result. */
function sorts<T>(order: Order<T>, items: readonly T[]): T[][] {
	return [
		order.sort(items),
		[...items].sort(order.compare),
		compile(order).sort(items),
		[...items].sort(compile(order).compare),
	];
}

const ids = (items: readonly { id: number }[]) => items.map((s) => s.id);

describe('match', () => {
	it('sorts groups in case order, within each group by its order, then by the steps after', () => {
		for (const sorted of sorts(byShape, shapes)) {
			expect(ids(sorted)).toEqual([5, 7, 3, 4, 1, 2, 6]);
		}
	});

	it('gives the same result as the equivalent when() chain', () => {
		const byWhen = new Order<Shape>()
			.when(
				(s) => s.kind === 'square',
				Order.by((s) => (s as Square).side, { direction: 'desc' }),
			)
			.when(
				(s) => s.kind === 'circle',
				Order.by((s) => (s as Circle).radius),
			)
			.when((s) => s.kind === 'triangle', new Order())
			.by((s) => s.id);
		expect(byShape.sort(shapes)).toEqual(byWhen.sort(shapes));
	});

	it('gives one result for every input order', () => {
		expect(distinctSorts(shapes, (s) => ids(byShape.sort(s))).size).toBe(1);
		expect(
			distinctSorts(shapes, (s) => ids([...s].sort(byShape.compare)))
				.size,
		).toBe(1);
	});

	it('sorts values that match no case last, by the steps after', () => {
		const order = match<Shape>()
			.with({ kind: 'circle' }, (o) => o.by((c) => c.radius))
			.with({ kind: 'square' }, (o) => o)
			// Exhaustive by type only: the data has a shape the type does not.
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive()
			.by((s) => s.id);
		const odd = { kind: 'hexagon', id: 0 } as unknown as Shape;
		for (const sorted of sorts(order, [odd, ...shapes])) {
			expect(ids(sorted)).toEqual([4, 1, 3, 5, 7, 2, 6, 0]);
		}
	});

	it('puts an item in the first case it matches only', () => {
		type Row = { id: number; vip: boolean; score: number; name: string };
		const rows: Row[] = [
			{ id: 1, vip: true, score: 5, name: 'b' },
			{ id: 2, vip: true, score: 5, name: 'a' },
			{ id: 3, vip: false, score: 1, name: 'c' },
		];
		const order = match<Row>()
			.with({ vip: true, score: P.number.gte(5) }, (o) =>
				o.by((r) => r.score),
			)
			// Rows 1 and 2 match this too, but it must not sort them by name.
			.with({ vip: true }, (o) => o.by((r) => r.name))
			.otherwise((o) => o)
			.by((r) => r.id);
		for (const sorted of sorts(order, rows)) {
			expect(ids(sorted)).toEqual([1, 2, 3]);
		}
	});

	it('supports guards, several patterns, P.when and .when()', () => {
		const order = match<Shape>()
			.with(
				{ kind: 'circle' },
				(c) => c.radius > 2,
				(o) => o,
			)
			.with({ kind: 'square', side: P.when((s) => s > 5) }, (o) => o)
			.when(
				(s) => s.id === 6,
				(o) => o,
			)
			.with({ kind: 'square' }, { kind: 'circle' }, (o) =>
				o.by((s) => -s.id),
			)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([1, 5, 7, 6, 4, 3, 2]);
		}
	});

	it('takes an order or no build in place of the build callback', () => {
		const bySide = Order.by((s: Square) => s.side, { direction: 'desc' });
		const byId = Order.by((x: { id: number }) => x.id, {
			direction: 'desc',
		});
		const withCallbacks = match<Shape>()
			.with({ kind: 'square' }, () => bySide)
			.with({ kind: 'circle' }, (o) =>
				o.by((c) => c.id, { direction: 'desc' }),
			)
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive()
			.by((s) => s.id);
		const without = match<Shape>()
			.with({ kind: 'square' }, bySide)
			.with({ kind: 'circle' }, byId)
			.with({ kind: 'triangle' })
			.exhaustive()
			.by((s) => s.id);
		expect(ids(without.sort(shapes))).toEqual(
			ids(withCallbacks.sort(shapes)),
		);
		for (const sorted of sorts(without, shapes)) {
			expect(ids(sorted)).toEqual(ids(withCallbacks.sort(shapes)));
		}
		const several = match<Shape>()
			.with({ kind: 'square' }, { kind: 'circle' }, byId)
			.with({ kind: 'triangle' })
			.exhaustive();
		const severalCallback = match<Shape>()
			.with({ kind: 'square' }, { kind: 'circle' }, (o) =>
				o.by((s) => s.id, { direction: 'desc' }),
			)
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive();
		for (const sorted of sorts(several, shapes)) {
			expect(ids(sorted)).toEqual(ids(severalCallback.sort(shapes)));
		}
	});

	it('matches nested objects and nullish values', () => {
		type Item = { id: number; shape: Shape | null };
		const items: Item[] = [
			{ id: 1, shape: null },
			{ id: 2, shape: { kind: 'circle', id: 0, radius: 2 } },
			{ id: 3, shape: { kind: 'square', id: 0, side: 1 } },
			{ id: 4, shape: { kind: 'circle', id: 0, radius: 1 } },
		];
		const order = match<Item>()
			.with({ shape: { kind: 'circle' } }, (o) =>
				o.by((i) => i.shape.radius),
			)
			.with({ shape: P.nullish }, (o) => o)
			.otherwise((o) => o);
		for (const sorted of sorts(order, items)) {
			expect(ids(sorted)).toEqual([4, 2, 1, 3]);
		}
	});

	it('sorts by a base order first', () => {
		const base = Order.by((s: Shape) => s.id % 2);
		const order = match(base)
			.with({ kind: 'triangle' }, (o) => o)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([2, 6, 4, 1, 3, 5, 7]);
		}
	});

	it('matches the same values as isMatching', () => {
		const sym = Symbol('s');
		const patterns: unknown[] = [
			1,
			'a',
			null,
			undefined,
			Number.NaN,
			0,
			-0,
			{},
			{ a: 1 },
			{ a: undefined },
			{ a: P.optional(1) },
			{ a: P._ },
			{ a: P.nullish },
			{ a: { b: 'x' } },
			{ a: 1, b: P.string },
			{ [sym]: 1 },
			[1, P._],
			P.union(1, { a: 1 }),
			P.not({ a: 1 }),
			P.intersection({ a: 1 }, { b: P.string }),
			P.array(P.number),
			[P.number, ...P.array(P.number)],
			P.instanceOf(Date),
			P.string.startsWith('a'),
			P.number.between(0, 1),
			P.boolean,
			P.bigint,
			P.symbol,
			P.nonNullable,
			P.select(),
			{ a: P.select() },
			{ a: P.number.int() },
		];
		const values: unknown[] = [
			1,
			'a',
			null,
			undefined,
			Number.NaN,
			0,
			-0,
			{},
			{ a: 1 },
			{ a: undefined },
			{ a: null },
			{ a: 2 },
			{ a: { b: 'x' } },
			{ a: { b: 'y' } },
			{ a: 1, b: 'z' },
			{ a: 1, b: 2 },
			{ [sym]: 1 },
			[1, 2],
			[1],
			Object.create({ a: 1 }),
			() => 1,
			[],
			[1, 2, 3],
			['a', 1],
			new Date(0),
			true,
			1n,
			'abc',
			0.5,
			sym,
			{ a: 1.5 },
		];
		for (const pattern of patterns) {
			const order = match<unknown>()
				.with(pattern as never, (o) => o)
				.otherwise((o) => o);
			// A value that matches comes before one that does not, and every other
			// pair ties.
			const matches = values.map((v) => isMatching(pattern as never, v));
			for (const [i, a] of values.entries()) {
				for (const [j, b] of values.entries()) {
					const expected =
						matches[i] === matches[j] ? 0 : matches[i] ? -1 : 1;
					expect([pattern, a, b, order.compare(a, b)]).toEqual([
						pattern,
						a,
						b,
						expected,
					]);
				}
			}
		}
	});
});

describe('match .when()', () => {
	it('adds a group for the items that pass a type guard', () => {
		const order = match<Shape>()
			.when(
				(s): s is Circle => s.kind === 'circle',
				(o) => o.by((c) => c.radius),
			)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([4, 1, 2, 3, 5, 6, 7]);
		}
	});

	it('adds a group for the items that pass a boolean predicate', () => {
		const order = match<Shape>()
			.when(
				(s) => s.id > 4,
				(o) => o.by((s) => s.id, { direction: 'desc' }),
			)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([7, 6, 5, 1, 2, 3, 4]);
		}
	});

	it('matches any truthy result', () => {
		const order = match<Shape>()
			.when(
				(s) => s.id % 3,
				(o) => o,
			)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([1, 2, 4, 5, 7, 3, 6]);
		}
	});

	it('keeps first-match order with .with() cases before and after', () => {
		const order = match<Shape>()
			.with({ kind: 'square' }, (o) => o.by((s) => s.side))
			// Squares 5 and 7 pass this too. If it sorted them, 7 would come first.
			.when(
				(s) => s.id !== 6,
				(o) => o.by((s) => s.id, { direction: 'desc' }),
			)
			.with({ kind: 'circle' })
			.with({ kind: 'triangle' })
			.exhaustive()
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([3, 5, 7, 4, 2, 1, 6]);
		}
	});

	it('makes an exhaustive order from type guards only', () => {
		const order = match<Shape>()
			.when(
				(s): s is Triangle => s.kind === 'triangle',
				(o) => o.by((t) => t.base),
			)
			.when(
				(s): s is Square | Circle => s.id > 0,
				(o) => o,
			)
			.exhaustive()
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([6, 2, 1, 3, 4, 5, 7]);
		}
	});
});

describe('match first match', () => {
	// A union, so the nullish case leaves the remaining values with a shape.
	type Item =
		| { id: number; shape: null }
		| { id: number; shape: { kind: 'circle' | 'square' } };
	const items: Item[] = [
		{ id: 1, shape: null },
		{ id: 2, shape: { kind: 'square' } },
		{ id: 3, shape: { kind: 'circle' } },
	];

	it('never runs a later .when() on an item an earlier case matched', () => {
		const order = match<Item>()
			.with({ shape: P.nullish })
			// Throws on `shape: null` if it runs on item 1.
			.when(
				(i) => i.shape.kind === 'circle',
				(o) => o,
			)
			.otherwise((o) => o);
		for (const sorted of sorts(order, items)) {
			expect(ids(sorted)).toEqual([1, 3, 2]);
		}
	});

	it('never runs a later P.when() or guard on an item an earlier case matched', () => {
		const byPWhen = match<Item>()
			.with({ shape: P.nullish })
			.with(P.when((i) => i.shape.kind === 'circle'))
			.otherwise((o) => o);
		// The build's steps check the case too, so this tests that check.
		const byPWhenBuild = match<Item>()
			.with({ shape: P.nullish }, (o) => o.by((i) => i.id))
			.with({ shape: P.when((shape) => shape.kind === 'circle') }, (o) =>
				o.by((i) => i.id),
			)
			.otherwise((o) => o);
		const byGuard = match<Item>()
			.with({ shape: P.nullish })
			.with(
				P._,
				(i) => i.shape.kind === 'circle',
				(o) => o,
			)
			.otherwise((o) => o);
		for (const order of [byPWhen, byPWhenBuild, byGuard]) {
			for (const sorted of sorts(order, items)) {
				expect(ids(sorted)).toEqual([1, 3, 2]);
			}
		}
	});

	it('passes a predicate only the items that no earlier case matched', () => {
		const seen = new Set<Shape['kind']>();
		const order = match<Shape>()
			.with({ kind: 'circle' })
			.when(
				(s) => (seen.add(s.kind), s.kind === 'square'),
				(o) => o,
			)
			.otherwise((o) => o);
		for (const sorted of sorts(order, shapes)) {
			expect(sorted).toHaveLength(shapes.length);
		}
		expect([...seen].sort()).toEqual(['square', 'triangle']);
	});
});

describe('match cases', () => {
	it('matches any of three or more patterns, P patterns among them', () => {
		const order = match<Shape>()
			.with(
				{ kind: 'triangle' },
				{ kind: 'circle', radius: P.number.gt(2) },
				{ id: 7 },
				(o) => o.by((s) => s.id, { direction: 'desc' }),
			)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([7, 6, 2, 1, 3, 4, 5]);
		}
	});

	it('keeps the input order inside a group with no steps', () => {
		const order = match<Shape>()
			.with({ kind: 'triangle' })
			.with({ kind: 'square' })
			.with({ kind: 'circle' })
			.exhaustive();
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([2, 6, 3, 5, 7, 1, 4]);
		}
	});

	it('sorts the otherwise group by its build', () => {
		const order = match<Shape>()
			.with({ kind: 'circle' })
			.otherwise((o) => o.by((s) => s.id, { direction: 'desc' }));
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([1, 4, 7, 6, 5, 3, 2]);
		}
	});

	it('is a plain order when otherwise is the only case', () => {
		const order = match<Shape>().otherwise((o) =>
			o.by((s) => s.id, { direction: 'desc' }),
		);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([7, 6, 5, 4, 3, 2, 1]);
		}
	});

	it('sorts primitive values', () => {
		const order = match<string | number | null>()
			.with(P.string, (o) => o.by((s) => s))
			.with(P.number, (o) => o.by((n) => n, { direction: 'desc' }))
			.with(P.nullish)
			.exhaustive();
		for (const sorted of sorts(order, [3, 'b', null, 1, 'a'])) {
			expect(sorted).toEqual(['a', 'b', 3, 1, null]);
		}
		const byLevel = match<'low' | 'mid' | 'high'>()
			.with('high')
			.with('mid')
			.with('low')
			.exhaustive();
		const levels: ('low' | 'mid' | 'high')[] = [
			'mid',
			'low',
			'high',
			'mid',
		];
		for (const sorted of sorts(byLevel, levels)) {
			expect(sorted).toEqual(['high', 'mid', 'mid', 'low']);
		}
	});

	it('sorts empty and one-item lists', () => {
		for (const sorted of sorts(byShape, [])) expect(sorted).toEqual([]);
		for (const sorted of sorts(byShape, [shapes[0]!])) {
			expect(ids(sorted)).toEqual([1]);
		}
	});
});

describe('match builder', () => {
	it('calls each build once, when the order is made', () => {
		let calls = 0;
		const count = <V>(o: Order<V>) => (calls++, o);
		const order = match<Shape>()
			.with({ kind: 'square' }, count)
			.with({ kind: 'circle' }, { id: 2 }, count)
			.when((s) => s.id > 0, count)
			.otherwise(count);
		expect(calls).toBe(4);
		for (const _ of sorts(order, shapes));
		expect(calls).toBe(4);
	});

	it('does not change a builder when a case is added to it', () => {
		const squares = match<Shape>().with({ kind: 'square' });
		const circlesNext = squares
			.with({ kind: 'circle' })
			.otherwise((o) => o)
			.by((s) => s.id);
		const trianglesNext = squares
			.with({ kind: 'triangle' })
			.otherwise((o) => o)
			.by((s) => s.id);
		expect(ids(circlesNext.sort(shapes))).toEqual([3, 5, 7, 1, 4, 2, 6]);
		expect(ids(trianglesNext.sort(shapes))).toEqual([3, 5, 7, 2, 6, 1, 4]);
		expect(ids(squares.otherwise((o) => o).sort(shapes))).toEqual([
			3, 5, 7, 1, 2, 4, 6,
		]);
	});
});

describe('match composition', () => {
	it('nests a match inside a group', () => {
		const order = match<Shape>()
			.with({ kind: 'circle' }, (o) =>
				match(o)
					.with({ radius: P.number.lt(2) })
					.otherwise((o) => o),
			)
			.otherwise((o) => o)
			.by((s) => s.id);
		for (const sorted of sorts(order, shapes)) {
			expect(ids(sorted)).toEqual([4, 1, 2, 3, 5, 6, 7]);
		}
	});

	it('sorts through Order.map', () => {
		const items = shapes.map((shape) => ({ id: shape.id, shape }));
		const order = Order.map(
			(i: (typeof items)[number]) => i.shape,
			byShape,
		);
		for (const sorted of sorts(order, items)) {
			expect(ids(sorted)).toEqual([5, 7, 3, 4, 1, 2, 6]);
		}
	});

	it('keeps the group order on reverse(), as for when()', () => {
		// reverse() flips every key, but not which predicate matches come first.
		for (const sorted of sorts(byShape.reverse(), shapes)) {
			expect(ids(sorted)).toEqual([3, 7, 5, 1, 4, 6, 2]);
		}
	});

	it('gives the same order as when() chains, also on reverse()', () => {
		const isSquare = (s: Shape) => s.kind === 'square';
		const isCircle = (s: Shape) => s.kind === 'circle';
		const whenChain = new Order<Shape>()
			.when(
				isSquare,
				Order.by((s: Shape) => s.id, { direction: 'desc' }),
			)
			.when(isCircle, new Order())
			.by((s) => s.id);
		const matched = match<Shape>()
			.with(
				{ kind: 'square' },
				Order.by((s: Shape) => s.id, { direction: 'desc' }),
			)
			.with({ kind: 'circle' })
			.otherwise()
			.by((s) => s.id);
		const items = shapes.map((shape) => ({ id: shape.id, shape }));
		const pairs = [
			[whenChain, matched],
			[whenChain.reverse(), matched.reverse()],
		] as const;
		for (const [expected, actual] of pairs) {
			const want = ids(expected.sort(shapes));
			const nested = Order.map(
				(i: (typeof items)[number]) => i.shape,
				actual,
			);
			for (const sorted of sorts(actual, shapes)) {
				expect(ids(sorted)).toEqual(want);
			}
			for (const sorted of sorts(nested, items)) {
				expect(ids(sorted)).toEqual(want);
			}
		}
	});

	it('sorts groups that pass the same Order as groups with their own copy', () => {
		const byIdDesc = Order.by((s: Shape) => s.id, { direction: 'desc' });
		const copy = () => Order.by((s: Shape) => s.id, { direction: 'desc' });
		const shared = match<Shape>()
			.with({ kind: 'square' }, byIdDesc)
			.with({ kind: 'circle' }, byIdDesc)
			.otherwise()
			.by((s) => s.id);
		const own = match<Shape>()
			.with({ kind: 'square' }, copy())
			.with({ kind: 'circle' }, copy())
			.otherwise()
			.by((s) => s.id);
		for (const order of [shared, shared.reverse()]) {
			const want = ids(
				(order === shared ? own : own.reverse()).sort(shapes),
			);
			for (const sorted of sorts(order, shapes)) {
				expect(ids(sorted)).toEqual(want);
			}
		}
		expect(ids(shared.sort(shapes))).toEqual([7, 5, 3, 4, 1, 2, 6]);
	});

	it('keeps the group order on reverse() with no builds', () => {
		const byKind = match<Shape>()
			.with({ kind: 'triangle' })
			.with({ kind: 'square' })
			.otherwise()
			.by((s) => s.id);
		for (const sorted of sorts(byKind.reverse(), shapes)) {
			expect(ids(sorted)).toEqual([6, 2, 7, 5, 3, 4, 1]);
		}
	});

	it('sorts an item by its current value after it changes', () => {
		const items: Shape[] = shapes.map((s) => ({ ...s }));
		const circle = items[0]!;
		for (const order of [byShape, compile(byShape)]) {
			Object.assign(circle, { kind: 'circle', radius: 3 });
			order.sort(items);
			[...items].sort(order.compare);
			Object.assign(circle, { kind: 'square', side: 9 });
			for (const sorted of [
				order.sort(items),
				[...items].sort(order.compare),
			]) {
				expect(ids(sorted)).toEqual([1, 5, 7, 3, 4, 2, 6]);
			}
		}
	});
});

describe('match short builds', () => {
	const byIdDesc = Order.by((x: { id: number }) => x.id, {
		direction: 'desc',
	});
	const callback = <V extends { id: number }>(o: Order<V>) =>
		o.by((s) => s.id, { direction: 'desc' });

	function expectSame(short: Order<Shape>, long: Order<Shape>) {
		const expected = ids(long.sort(shapes));
		for (const sorted of sorts(short, shapes)) {
			expect(ids(sorted)).toEqual(expected);
		}
	}

	it('takes an order or nothing in place of a .when() build', () => {
		expectSame(
			match<Shape>()
				.when((s) => s.id > 4)
				.when((s) => s.id > 1, byIdDesc)
				.otherwise((o) => o)
				.by((s) => s.id),
			match<Shape>()
				.when(
					(s) => s.id > 4,
					(o) => o,
				)
				.when((s) => s.id > 1, callback)
				.otherwise((o) => o)
				.by((s) => s.id),
		);
	});

	it('takes an order or nothing in place of an otherwise() build', () => {
		expectSame(
			match<Shape>()
				.with({ kind: 'circle' })
				.otherwise()
				.by((s) => s.id),
			match<Shape>()
				.with({ kind: 'circle' })
				.otherwise((o) => o)
				.by((s) => s.id),
		);
		expectSame(
			match<Shape>().with({ kind: 'circle' }).otherwise(byIdDesc),
			match<Shape>().with({ kind: 'circle' }).otherwise(callback),
		);
	});

	it('takes an order in place of a guard build', () => {
		expectSame(
			match<Shape>()
				.with({ kind: 'square' }, (s) => s.side > 2, byIdDesc)
				.otherwise()
				.by((s) => s.id),
			match<Shape>()
				.with({ kind: 'square' }, (s) => s.side > 2, callback)
				.otherwise()
				.by((s) => s.id),
		);
	});
});
