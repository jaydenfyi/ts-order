import fc from 'fast-check';
import { isMatching, P } from 'ts-pattern';
import { describe, expect, it } from 'vitest';
import { compile } from './compiled-order.js';
import { match } from './match.js';
import { Order } from './order.js';
import type { Comparator } from './types.js';

type Item = {
	id: number;
	n: number | null | undefined;
	s?: string | undefined;
	d: Date | null;
	b: boolean;
	g: number;
};

const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const ids = (items: Item[]) => items.map((item) => item.id);

// Small ranges, so that ties and matches are common. `s` is sometimes left
// out, to test patterns against a missing key.
const itemArb: fc.Arbitrary<Item> = fc.record(
	{
		id: fc.constant(0),
		n: fc.oneof(
			fc.integer({ min: -2, max: 2 }),
			fc.double(),
			// Literal patterns must match these as Object.is does, as in ts-pattern.
			fc.constantFrom(null, undefined, -0, Number.NaN),
		),
		s: fc.option(fc.constantFrom('', 'a', 'ab', 'b'), { nil: undefined }),
		d: fc.option(
			fc.integer({ min: 0, max: 2 }).map((time) => new Date(time)),
			{ nil: null },
		),
		b: fc.boolean(),
		g: fc.integer({ min: 0, max: 2 }),
	},
	{ requiredKeys: ['id', 'n', 'd', 'b', 'g'] },
);
const itemsArb = fc
	.array(itemArb, { maxLength: 30 })
	.map((items) => items.map((item, id) => ({ ...item, id })));

// Patterns for each key, mixing literals (ts-order's fast path) with P
// patterns (ts-pattern's isMatching).
const keyPatterns = {
	b: fc.constantFrom(true, false, P._, P.boolean),
	g: fc.constantFrom(0, 1, 2, P.number.gt(0), P.union(0, 2), P.not(1)),
	n: fc.constantFrom(
		0,
		-0,
		Number.NaN,
		1,
		P.nullish,
		P.number,
		P.number.gte(0),
		P.not(P.nullish),
	),
	s: fc.constantFrom(
		'',
		'a',
		P.string,
		P.nullish,
		undefined,
		P.string.startsWith('a'),
		P.optional('a'),
	),
	d: fc.constantFrom(null, P.instanceOf(Date), P.nullish),
};
const objectPattern = fc.record(keyPatterns, { requiredKeys: [] });
// One key, such as `{ kind: 'circle' }`: the usual case, with its own fast path.
const oneKeyPattern = fc
	.constantFrom(...(Object.keys(keyPatterns) as (keyof typeof keyPatterns)[]))
	.chain((key) => keyPatterns[key].map((p) => ({ [key]: p })));
const patternArb: fc.Arbitrary<unknown> = fc.oneof(
	{ arbitrary: objectPattern, weight: 3 },
	{ arbitrary: oneKeyPattern, weight: 3 },
	fc.constant(P._),
	objectPattern.map((p) => P.not(p)),
	fc.tuple(objectPattern, objectPattern).map(([p, q]) => P.union(p, q)),
	fc
		.tuple(objectPattern, objectPattern)
		.map(([p, q]) => P.intersection(p, q)),
	fc
		.constantFrom(...predicates())
		.map((f) => P.when((value: unknown) => f(value as Item))),
);

function predicates() {
	return [
		(item: Item) => item.b,
		(item: Item) => item.g > 0,
		(item: Item) => item.n != null && item.n > 0,
		(item: Item) => item.s === 'a',
	];
}

// Steps for the order inside a group, and for the base and the steps after.
type Step = [key: (item: Item) => unknown, options?: object];
const stepArb: fc.Arbitrary<Step> = fc.constantFrom<Step>(
	[(item) => item.g],
	[(item) => item.n, { direction: 'desc' }],
	[(item) => item.s, { nulls: 'first' }],
	[(item) => item.d],
	[
		(item) => item.b,
		{ direction: 'desc', predicate: (item: Item) => item.g > 0 },
	],
);
const stepsArb = fc.array(stepArb, { maxLength: 2 });
const withSteps = (order: Order<Item>, steps: Step[]) =>
	steps.reduce((o, [key, options]) => o.by(key as never, options), order);

type Build =
	| { kind: 'none' }
	| { kind: 'callback'; steps: Step[] }
	| { kind: 'order'; steps: Step[] };
const givenBuildArb: fc.Arbitrary<Build> = fc.oneof(
	stepsArb.map((steps) => ({ kind: 'callback' as const, steps })),
	stepsArb.map((steps) => ({ kind: 'order' as const, steps })),
);
const buildArb: fc.Arbitrary<Build> = fc.oneof(
	fc.constant({ kind: 'none' as const }),
	givenBuildArb,
);

/** The arguments that pass `build` to a case: none, a callback or an `Order`. */
const buildArgs = (build: Build): unknown[] =>
	build.kind === 'none'
		? []
		: build.kind === 'callback'
			? [(o: Order<Item>) => withSteps(o, build.steps)]
			: [withSteps(new Order<Item>(), build.steps)];
const buildSteps = (build: Build): Step[] =>
	build.kind === 'none' ? [] : build.steps;

type Case =
	| { type: 'with'; patterns: unknown[]; build: Build }
	| {
			type: 'guard';
			pattern: unknown;
			guard: (item: Item) => boolean;
			build: Build;
	  }
	| { type: 'when'; predicate: (item: Item) => unknown; build: Build };
const caseArb: fc.Arbitrary<Case> = fc.oneof(
	{
		arbitrary: fc.record({
			type: fc.constant('with' as const),
			patterns: fc.array(patternArb, { minLength: 1, maxLength: 3 }),
			build: buildArb,
		}),
		weight: 4,
	},
	fc.record({
		type: fc.constant('guard' as const),
		pattern: patternArb,
		guard: fc.constantFrom(...predicates()),
		// A guard needs its build: `(pattern, guard)` reads as a pattern and a build.
		build: givenBuildArb,
	}),
	fc.record({
		type: fc.constant('when' as const),
		predicate: fc.constantFrom<(item: Item) => unknown>(
			...predicates(),
			(item) => item.g, // truthy, not boolean
		),
		build: buildArb,
	}),
);

type Setup = {
	base: Step[];
	cases: Case[];
	/** The last group's build, or `undefined` to end with `.exhaustive()`. */
	otherwise: Build | undefined;
	after: Step[];
};
const setupArb: fc.Arbitrary<Setup> = fc.record({
	base: stepsArb,
	cases: fc.array(caseArb, { maxLength: 4 }),
	otherwise: fc.option(buildArb, { nil: undefined }),
	after: stepsArb,
});

/** The order `match` builds for `setup`. `watch` wraps each case's tests. */
function toMatch(
	setup: Setup,
	watch: (
		index: number,
		test: (item: Item) => unknown,
	) => (item: Item) => unknown = (_, test) => test,
): Order<Item> {
	// Loosely typed: the cases are random, so their types cannot be checked here.
	let builder: any = match(withSteps(new Order<Item>(), setup.base));
	for (const [index, c] of setup.cases.entries()) {
		if (c.type === 'when') {
			builder = builder.when(
				watch(index, c.predicate),
				...buildArgs(c.build),
			);
		} else if (c.type === 'guard') {
			builder = builder.with(
				c.pattern,
				watch(index, c.guard),
				...buildArgs(c.build),
			);
		} else {
			builder = builder.with(...c.patterns, ...buildArgs(c.build));
		}
	}
	const order: Order<Item> = setup.otherwise
		? builder.otherwise(...buildArgs(setup.otherwise))
		: builder.exhaustive();
	return withSteps(order, setup.after);
}

/** Whether case `c` matches `item`, with ts-pattern's own isMatching. */
function caseMatches(c: Case, item: Item): boolean {
	if (c.type === 'when') return !!c.predicate(item);
	if (c.type === 'guard')
		return isMatching(c.pattern as never, item) && c.guard(item);
	return c.patterns.some((p) => isMatching(p as never, item));
}

/**
 * The reference model: an item's group is the first case it matches (then
 * `otherwise`, then no group). Sort by the base, then the group, then the
 * group's own steps, then the steps after.
 */
function reference(setup: Setup): Comparator<Item> {
	const base = withSteps(new Order<Item>(), setup.base).compare;
	const groups = setup.cases.map(
		(c) => withSteps(new Order<Item>(), buildSteps(c.build)).compare,
	);
	if (setup.otherwise)
		groups.push(
			withSteps(new Order<Item>(), buildSteps(setup.otherwise)).compare,
		);
	const after = withSteps(new Order<Item>(), setup.after).compare;
	const group = (item: Item) => {
		const index = setup.cases.findIndex((c) => caseMatches(c, item));
		return index !== -1
			? index
			: setup.otherwise
				? setup.cases.length
				: groups.length;
	};
	return (a, b) => {
		const ga = group(a);
		const gb = group(b);
		return (
			base(a, b) ||
			ga - gb ||
			(ga < groups.length ? groups[ga]!(a, b) : 0) ||
			after(a, b)
		);
	};
}

function isConsistent<T>(compareFn: Comparator<T>, a: T, b: T, c: T): boolean {
	const ab = compareFn(a, b);
	return (
		compareFn(a, a) === 0 &&
		sign(ab) === -sign(compareFn(b, a)) &&
		!(ab <= 0 && compareFn(b, c) <= 0 && compareFn(a, c) > 0)
	);
}

describe('match properties', () => {
	it('matches the same items as isMatching', () => {
		fc.assert(
			fc.property(patternArb, itemArb, itemArb, (pattern, a, b) => {
				const order = match<Item>()
					.with(pattern as never)
					.otherwise((o) => o);
				// An item that matches comes first, and every other pair ties.
				const expected =
					+isMatching(pattern as never, b) -
					+isMatching(pattern as never, a);
				expect(sign(order.compare(a, b))).toBe(expected);
			}),
			{ numRuns: 5000 },
		);
	});

	it('compare agrees with the reference model', () => {
		fc.assert(
			fc.property(setupArb, itemArb, itemArb, (setup, a, b) => {
				const order = toMatch(setup);
				const expected = sign(reference(setup)(a, b));
				expect(sign(order.compare(a, b))).toBe(expected);
				expect(sign(compile(order).compare(a, b))).toBe(expected);
			}),
			{ numRuns: 500 },
		);
	});

	it('every sort agrees with a stable sort by the reference model', () => {
		fc.assert(
			fc.property(setupArb, itemsArb, (setup, items) => {
				const order = toMatch(setup);
				const expected = ids(items.slice().sort(reference(setup)));
				expect(ids(order.sort(items))).toEqual(expected);
				expect(ids(items.slice().sort(order.compare))).toEqual(
					expected,
				);
				expect(ids(compile(order).sort(items))).toEqual(expected);
				expect(ids(items.slice().sort(compile(order).compare))).toEqual(
					expected,
				);
			}),
			{ numRuns: 300 },
		);
	});

	it('compare is a consistent comparator', () => {
		fc.assert(
			fc.property(setupArb, itemArb, itemArb, itemArb, (setup, a, b, c) =>
				isConsistent(toMatch(setup).compare, a, b, c),
			),
		);
	});

	it('runs a case only on items that no earlier case matched', () => {
		fc.assert(
			fc.property(setupArb, itemsArb, (setup, items) => {
				const seen: string[] = [];
				const order = toMatch(setup, (index, test) => (item) => {
					// A guard runs only after its pattern matched, so checking the
					// earlier cases is enough for every kind of case.
					const earlier = setup.cases
						.slice(0, index)
						.findIndex((c) => caseMatches(c, item));
					if (earlier !== -1)
						seen.push(
							`case ${index} ran on item ${item.id}, matched by case ${earlier}`,
						);
					return test(item);
				});
				order.sort(items);
				items.slice().sort(order.compare);
				compile(order).sort(items);
				expect(seen).toEqual([]);
			}),
		);
	});

	it('gives one result for any input order', () => {
		fc.assert(
			fc.property(
				setupArb,
				itemsArb.chain((items) =>
					fc.tuple(
						fc.constant(items),
						fc.shuffledSubarray(items, {
							minLength: items.length,
							maxLength: items.length,
						}),
					),
				),
				(setup, [items, shuffled]) => {
					const order = toMatch(setup).by((item) => item.id);
					expect(ids(order.sort(shuffled))).toEqual(
						ids(order.sort(items)),
					);
				},
			),
		);
	});
});
