import { P } from 'ts-pattern';
import { describe, expectTypeOf, it } from 'vitest';
import { match } from './match.js';
import { Order } from './order.js';

type Square = { kind: 'square'; id: number; side: number };
type Circle = { kind: 'circle'; id: number; radius: number };
type Triangle = { kind: 'triangle'; id: number; base: number };
type Shape = Square | Circle | Triangle;

describe('match types', () => {
	it('narrows each case and returns an Order of the item type', () => {
		const order = match<Shape>()
			.with({ kind: 'square' }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square>>();
				return o.by((s) => s.side, { direction: 'desc' });
			})
			.with({ kind: 'circle' }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Circle>>();
				return o.by((c) => c.radius);
			})
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive()
			.by((s) => s.id);
		expectTypeOf(order).toEqualTypeOf<Order<Shape>>();
	});

	it('infers an inline Order.by only with an annotation', () => {
		match<Shape>()
			.with({ kind: 'circle' }, () => Order.by((c: Circle) => c.radius))
			// @ts-expect-error -- `c` is implicitly any
			.with({ kind: 'square' }, () => Order.by((c) => c.side));
	});

	it('narrows P.union, multiple patterns, P.string, P.nullish and P.not', () => {
		match<Shape>()
			.with({ kind: P.union('square', 'circle') }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square | Circle>>();
				return o;
			})
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive();

		match<Shape>()
			.with({ kind: 'square' }, { kind: 'circle' }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square | Circle>>();
				return o;
			})
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive();

		match<string | number | null | undefined>()
			.with(P.string, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<string>>();
				return o.by((s) => s.length);
			})
			.with(P.nullish, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<null | undefined>>();
				return o;
			})
			.with(P.number, (o) => o.by((n) => n))
			.exhaustive();

		match<Shape>()
			.with({ kind: P.not('square') }, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Circle | Triangle>>();
				return o;
			})
			.otherwise((o) => {
				// P.not leaves the remaining union, as in ts-pattern
				expectTypeOf(o).toEqualTypeOf<Order<Square>>();
				return o;
			});
	});

	it('narrows nested object patterns', () => {
		type Item = { id: number; shape: Shape };
		match<Item>()
			.with({ shape: { kind: 'circle' } }, (o) => {
				expectTypeOf(o).toEqualTypeOf<
					Order<{ id: number; shape: Circle }>
				>();
				return o.by((i) => i.shape.radius);
			})
			.otherwise((o) => o);
	});

	it('narrows with guards and P.when', () => {
		match<Shape>()
			.with(
				{ kind: 'circle' },
				(c) => c.radius > 5,
				(o) => {
					expectTypeOf(o).toEqualTypeOf<Order<Circle>>();
					return o.by((c) => c.radius);
				},
			)
			.with({ kind: 'circle', radius: P.when((r) => r > 1) }, (o) => o)
			.with({ kind: 'circle' }, (o) => o)
			.when(
				(s): s is Square => s.kind === 'square',
				(o) => {
					expectTypeOf(o).toEqualTypeOf<Order<Square>>();
					return o;
				},
			)
			.with({ kind: 'triangle' }, (o) => o)
			.exhaustive();
	});

	it('appends groups to a base order', () => {
		const base = Order.by((s: Shape) => s.id);
		expectTypeOf(
			match(base)
				.with({ kind: 'circle' }, (o) => o)
				.otherwise((o) => o),
		).toEqualTypeOf<Order<Shape>>();
	});

	it('rejects a missing case, a duplicate case and an unknown property', () => {
		const missing = match<Shape>()
			.with({ kind: 'square' }, (o) => o)
			.with({ kind: 'circle' }, (o) => o);
		// @ts-expect-error -- triangle is missing
		missing.exhaustive();

		missing
			// @ts-expect-error -- square is handled already
			.with({ kind: 'square' }, (o) => o);

		match<Shape>()
			// @ts-expect-error -- no such property
			.with({ kynd: 'square' }, (o) => o);

		match<Shape>()
			// @ts-expect-error -- not a kind
			.with({ kind: 'hexagon' }, (o) => o);

		// A guard or a test-only pattern leaves the case in the remaining union.
		const guarded = match<Shape>()
			.with(
				{ kind: 'square' },
				() => true,
				(o) => o,
			)
			.with({ kind: 'circle', radius: P.number.gt(1) }, (o) => o)
			.with({ kind: 'triangle', base: P.when((b) => b > 1) }, (o) => o);
		// @ts-expect-error -- every case could fail its test
		guarded.exhaustive();
	});
});

describe('match .when() types', () => {
	it('narrows to a type guard and removes it from the remaining values', () => {
		match<Shape>()
			.when(
				(s): s is Circle => s.kind === 'circle',
				(o) => {
					expectTypeOf(o).toEqualTypeOf<Order<Circle>>();
					return o;
				},
			)
			.otherwise((o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square | Triangle>>();
				return o;
			});
		match<Shape>()
			.when(
				(s): s is Circle => s.kind === 'circle',
				(o) => o,
			)
			.when(
				(s): s is Square | Triangle => s.id > 0,
				(o) => o,
			)
			.exhaustive();
	});

	it('passes the predicate the values that no earlier case matched', () => {
		match<Shape>()
			.with({ kind: 'circle' })
			.when(
				(s) => {
					expectTypeOf(s).toEqualTypeOf<Square | Triangle>();
					return true;
				},
				(o) => o,
			)
			.otherwise((o) => o);
	});

	it('keeps every value for a predicate that is not a type guard', () => {
		match<Shape>()
			.when(
				(s) => s.id % 2,
				(o) => {
					expectTypeOf(o).toEqualTypeOf<Order<Shape>>();
					return o;
				},
			)
			.otherwise((o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Shape>>();
				return o;
			});
		match<Shape>()
			.when(
				(s) => s.id > 1,
				(o) => o,
			)
			.with({ kind: 'square' })
			.with({ kind: 'triangle' })
			// @ts-expect-error -- every circle is left, as the predicate is not a type guard
			.exhaustive();
		// TypeScript infers `s is Circle` from this predicate, so it narrows, as in ts-pattern.
		match<Shape>()
			.when(
				(s) => s.kind === 'circle',
				(o) => {
					expectTypeOf(o).toEqualTypeOf<Order<Circle>>();
					return o;
				},
			)
			.with({ kind: 'square' })
			.with({ kind: 'triangle' })
			.exhaustive();
	});
});

describe('match build types', () => {
	it('rejects a build that returns an order for another type, or no order', () => {
		const bySide = Order.by((s: Square) => s.side);
		// @ts-expect-error -- a Square order for the circle group
		match<Shape>().with({ kind: 'circle' }, () => bySide);
		// @ts-expect-error -- not an Order
		match<Shape>().with({ kind: 'circle' }, () => 1);
	});

	it('takes an order for a wider type after several patterns', () => {
		const byId = Order.by((x: { id: number }) => x.id);
		const bySide = Order.by((s: Square) => s.side);
		match<Shape>()
			.with({ kind: 'circle' }, { kind: 'square' }, byId)
			.with({ kind: 'triangle' })
			.exhaustive();
		// @ts-expect-error -- a Square order for circles and squares
		match<Shape>().with({ kind: 'circle' }, { kind: 'square' }, bySide);
	});

	it('nests a match inside a group', () => {
		match<Shape>()
			.with({ kind: 'circle' }, (o) =>
				match(o)
					.with({ radius: P.number.lt(2) }, (inner) => {
						expectTypeOf(inner).toEqualTypeOf<Order<Circle>>();
						return inner;
					})
					.otherwise((inner) => inner),
			)
			.otherwise((o) => o);
	});
});

describe('match item types', () => {
	it('narrows primitive and literal unions', () => {
		match<string | number | null>()
			.with(P.string, (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<string>>();
				return o;
			})
			.with(P.number)
			.otherwise((o) => {
				expectTypeOf(o).toEqualTypeOf<Order<null>>();
				return o;
			});
		match<'low' | 'mid' | 'high'>()
			.with('high')
			.with('mid', (o) => {
				expectTypeOf(o).toEqualTypeOf<Order<'mid'>>();
				return o;
			})
			.with('low')
			.exhaustive();
		const highThenMid = match<'low' | 'mid' | 'high'>()
			.with('high')
			.with('mid');
		// @ts-expect-error -- low is left
		highThenMid.exhaustive();
	});

	it('returns an Order of the item type from every ending', () => {
		const ended = match<Shape>().with({ kind: 'circle' });
		expectTypeOf(ended.otherwise((o) => o)).toEqualTypeOf<Order<Shape>>();
		expectTypeOf(
			ended
				.with({ kind: 'square' })
				.with({ kind: 'triangle' })
				.exhaustive(),
		).toEqualTypeOf<Order<Shape>>();
		expectTypeOf(
			match(Order.by((s: Shape) => s.id))
				.otherwise((o) => o)
				.by((s) => s.kind),
		).toEqualTypeOf<Order<Shape>>();
	});
});

describe('match short build types', () => {
	const byId = Order.by((x: { id: number }) => x.id);
	const bySide = Order.by((s: Square) => s.side);

	it('narrows and removes values the same with no .when() build', () => {
		match<Shape>()
			.when((s): s is Circle => s.kind === 'circle')
			.otherwise((o) => {
				expectTypeOf(o).toEqualTypeOf<Order<Square | Triangle>>();
				return o;
			});
		match<Shape>()
			.when((s): s is Circle => s.kind === 'circle', byId)
			.when((s): s is Square | Triangle => s.id > 0)
			.exhaustive();
	});

	it('takes an order for a wider type, and rejects one for another type', () => {
		match<Shape>().with({ kind: 'square' }, (s) => s.side > 2, bySide);
		match<Shape>().with({ kind: 'circle' }).otherwise(byId);
		// @ts-expect-error -- a Square order for every shape
		match<Shape>().when((s) => s.id > 1, bySide);
		// @ts-expect-error -- a Square order for circles
		match<Shape>().with({ kind: 'circle' }, (c) => c.radius > 1, bySide);
		// @ts-expect-error -- a Square order for circles and triangles
		match<Shape>().with({ kind: 'square' }).otherwise(bySide);
	});

	it('returns an Order of the item type from otherwise()', () => {
		expectTypeOf(match<Shape>().otherwise()).toEqualTypeOf<Order<Shape>>();
		expectTypeOf(match<Shape>().otherwise(byId)).toEqualTypeOf<
			Order<Shape>
		>();
	});
});
