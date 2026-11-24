import { match as tsMatch, P } from 'ts-pattern';
import { describe, expectTypeOf, test } from 'vitest';
import { match } from './match.js';
import { Order } from './order.js';

type Circle = { kind: 'circle'; id: number; radius: number };
type Square = { kind: 'square'; id: number; side: number };
type Triangle = { kind: 'triangle'; id: number; base: number };
type Shape = Circle | Square | Triangle;
type Item = { id: number; shape: Shape };
type Pair = ['a' | 'b', boolean];
type Row = { name: string | null; n: number };

declare const shape: Shape;
declare const item: Item;
declare const pair: Pair;
declare const row: Row;

// Each test runs the same cases through ts-pattern and `match`, and checks
// that both narrow each case to the same type and agree on exhaustiveness.
describe('match follows ts-pattern', () => {
	test('a discriminant, then the rest', () => {
		tsMatch(shape)
			.with({ kind: 'circle' }, (v) =>
				expectTypeOf(v).toEqualTypeOf<Circle>(),
			)
			.otherwise((v) =>
				expectTypeOf(v).toEqualTypeOf<Square | Triangle>(),
			);
		match<Shape>()
			.with({ kind: 'circle' }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Circle>>();
				return o;
			})
			.otherwise((o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square | Triangle>>();
				return o;
			});
	});

	test('P.union and several patterns', () => {
		tsMatch(shape)
			.with({ kind: P.union('circle', 'square') }, (v) =>
				expectTypeOf(v).toEqualTypeOf<Circle | Square>(),
			)
			.with({ kind: 'triangle' }, () => 0)
			.exhaustive();
		match<Shape>()
			.with({ kind: P.union('circle', 'square') }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Circle | Square>>();
				return o;
			})
			.with({ kind: 'triangle' })
			.exhaustive();
		tsMatch(shape)
			.with({ kind: 'circle' }, { kind: 'square' }, () => 0)
			.with({ kind: 'triangle' }, () => 0)
			.exhaustive();
		match<Shape>()
			.with({ kind: 'circle' }, { kind: 'square' })
			.with({ kind: 'triangle' })
			.exhaustive();
	});

	test('P.not removes the values it matches', () => {
		tsMatch(shape)
			.with({ kind: P.not('square') }, () => 0)
			.otherwise((v) => expectTypeOf(v).toEqualTypeOf<Square>());
		match<Shape>()
			.with({ kind: P.not('square') })
			.otherwise((o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square>>();
				return o;
			});
		tsMatch(shape)
			.with({ kind: P.not('square') }, () => 0)
			.with({ kind: 'square' }, () => 0)
			.exhaustive();
		match<Shape>()
			.with({ kind: P.not('square') })
			.with({ kind: 'square' })
			.exhaustive();
	});

	test('patterns that only test a value remove nothing', () => {
		tsMatch(shape)
			.with({ kind: 'circle', radius: P.number.gt(1) }, () => 0)
			.with({ kind: 'circle' }, (v) =>
				expectTypeOf(v).toEqualTypeOf<Circle>(),
			)
			.otherwise(() => 0);
		match<Shape>()
			.with({ kind: 'circle', radius: P.number.gt(1) })
			.with({ kind: 'circle' }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Circle>>();
				return o;
			})
			.otherwise((o) => o);
		tsMatch(shape)
			.with(
				P.when((s) => s.id > 1),
				() => 0,
			)
			// @ts-expect-error a P.when without a type guard leaves every case
			.exhaustive();
		match<Shape>()
			.with(P.when((s) => s.id > 1))
			// @ts-expect-error a P.when without a type guard leaves every case
			.exhaustive();
		match<Shape>()
			.with(
				P.when((s) => s.id > 1),
				(o) => o,
			)
			.with({ id: P.when((n) => n > 1) })
			.otherwise((o) => o);
	});

	test('a union nested in an object', () => {
		tsMatch(item)
			.with({ shape: { kind: 'circle' } }, (v) =>
				expectTypeOf(v).toEqualTypeOf<{ id: number; shape: Circle }>(),
			)
			.with({ shape: { kind: 'square' } }, () => 0)
			.with({ shape: { kind: 'triangle' } }, () => 0)
			.exhaustive();
		match<Item>()
			.with({ shape: { kind: 'circle' } }, (o) => {
				expectTypeOf(o).toEqualTypeOf<
					Order<{ id: number; shape: Circle }>
				>();
				return o;
			})
			.with({ shape: { kind: 'square' } })
			.with({ shape: { kind: 'triangle' } })
			.exhaustive();
		tsMatch(item)
			.with({ shape: { kind: 'circle' } }, () => 0)
			// @ts-expect-error square and triangle are left
			.exhaustive();
		match<Item>()
			.with({ shape: { kind: 'circle' } })
			// @ts-expect-error square and triangle are left
			.exhaustive();
	});

	test('a tuple of unions', () => {
		tsMatch(pair)
			.with(['a', true], () => 0)
			.with(['a', false], () => 0)
			.with(['b', P._], () => 0)
			.exhaustive();
		match<Pair>()
			.with(['a', true])
			.with(['a', false])
			.with(['b', P._])
			.exhaustive();
		tsMatch(pair)
			.with(['a', true], () => 0)
			.with(['b', P._], () => 0)
			// @ts-expect-error ['a', false] is left
			.exhaustive();
		match<Pair>()
			.with(['a', true])
			.with(['b', P._])
			// @ts-expect-error ['a', false] is left
			.exhaustive();
	});

	test('P.string and P.nullish on a property', () => {
		tsMatch(row)
			.with({ name: P.string }, (v) =>
				expectTypeOf(v).toEqualTypeOf<{ name: string; n: number }>(),
			)
			.with({ name: P.nullish }, () => 0)
			.exhaustive();
		match<Row>()
			.with({ name: P.string }, (o) => {
				expectTypeOf(o).toEqualTypeOf<
					Order<{ name: string; n: number }>
				>();
				return o;
			})
			.with({ name: P.nullish })
			.exhaustive();
	});

	test('guards and .when()', () => {
		tsMatch(shape)
			.with(
				{ kind: 'circle' },
				(c): c is Circle & { radius: 1 } => c.radius === 1,
				(v) => expectTypeOf(v).toEqualTypeOf<Circle & { radius: 1 }>(),
			)
			.with({ kind: 'circle' }, () => 0)
			.when(
				(s): s is Square => s.kind === 'square',
				(v) => expectTypeOf(v).toEqualTypeOf<Square>(),
			)
			.with({ kind: 'triangle' }, () => 0)
			.exhaustive();
		match<Shape>()
			.with(
				{ kind: 'circle' },
				(c): c is Circle & { radius: 1 } => c.radius === 1,
				(o) => {
					expectTypeOf(o).toEqualTypeOf<
						Order<Circle & { radius: 1 }>
					>();
					return o;
				},
			)
			.with({ kind: 'circle' })
			.when(
				(s): s is Square => s.kind === 'square',
				(o) => {
					expectTypeOf(o).toEqualTypeOf<Order<Square>>();
					return o;
				},
			)
			.with({ kind: 'triangle' })
			.exhaustive();
	});
});

describe('match build argument', () => {
	const byRadius = Order.by((c: Circle) => c.radius, { direction: 'desc' });
	const byId = Order.by((x: { id: number }) => x.id);

	test('can be left out, a callback or an order', () => {
		expectTypeOf(
			match<Shape>()
				.with({ kind: 'circle' }, byRadius)
				.with({ kind: 'square' }, byId)
				.with({ kind: 'triangle' }, (o) => o.by((t) => t.base))
				.exhaustive(),
		).toEqualTypeOf<Order<Shape>>();
	});

	test('rejects an order for another type and a guard with no build', () => {
		const bySide = Order.by((s: Square) => s.side);
		// @ts-expect-error a Square order on the circle group
		match<Shape>().with({ kind: 'circle' }, bySide);
		// @ts-expect-error a guard needs a build as the third argument
		match<Shape>().with({ kind: 'circle' }, (c) => c.radius > 1);
	});
});
