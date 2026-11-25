import type { P } from 'ts-pattern';
import { isMatching } from 'ts-pattern';
import { Order, type OrderStep } from './order.js';
import type { DeepExclude } from './vendor/DeepExclude.js';
import type { InvertPatternForExclude } from './vendor/InvertPattern.js';

/** Builds the order within one group from an empty `Order` of the group's type. */
type Build<V> = (order: Order<V>) => Order<V>;

/** How a case sorts within its group: a build, an order, or nothing. */
type Within<V> = Build<V> | Order<V> | undefined;

/** `P.narrow`, with the constraint that ts-pattern 5.5 and 5.6 put on its pattern. */
type Narrow<R, p> = p extends P.Pattern<any> ? P.narrow<R, p> : never;

/** `a` without each handled case, in turn: ts-pattern's, from its `Match` type. */
type DeepExcludeAll<a, tupleList extends any[]> = [a] extends [never]
	? never
	: tupleList extends [infer excluded, ...infer tail]
		? DeepExcludeAll<DeepExclude<a, excluded>, tail>
		: a;

/** ts-pattern's parameter type for a pattern: it gives `P.when` callbacks their contextual type. */
type PatternParam<R, p> = [p] extends [never] ? P.Pattern<R> : p;

/** Same shape as ts-pattern's, so the error reads the same: "Type 'NonExhaustiveError<…>' has no call signatures". */
interface NonExhaustiveError<_Remaining> {
	__nonExhaustive: never;
}

/** The values of `R` that pattern `p`, narrowed to `V`, matches: one handled case. */
type Handled<p, V> = InvertPatternForExclude<p, V>;

/** The handled cases for several patterns. */
type HandledAll<ps extends readonly any[], V> = {
	-readonly [k in keyof ps]: Handled<ps[k], V>;
};

/** The type that several patterns narrow `R` to. */
type NarrowAny<R, ps extends readonly any[]> = ps[number] extends infer p
	? p extends any
		? Narrow<R, p>
		: never
	: never;

/** A type guard's narrowed type, or for any other predicate its parameter type. */
type GuardValue<F> = F extends ((value: any) => value is infer b)
	? b
	: F extends (value: infer a) => unknown
		? a
		: never;

/**
 * A builder of an order made of groups, one per `.with()` case. `T` is the
 * item type, `R` the values that no case matches yet, and `H` the cases
 * handled so far, as in ts-pattern's `Match`.
 */
export interface OrderMatch<T, R, H extends any[] = []> {
	/** Add the next group: the items that match `pattern` and no earlier case, in no order of their own. */
	with<const p extends P.Pattern<R>, V extends Narrow<R, p>>(
		pattern: PatternParam<R, p>,
	): Handled<p, V> extends infer h
		? OrderMatch<T, Exclude<R, h>, [...H, h]>
		: never;
	/**
	 * Add the next group: the items that match `pattern` and no earlier case.
	 * `build` receives an empty `Order` of the matched type and returns how to
	 * sort within the group.
	 */
	with<const p extends P.Pattern<R>, V extends Narrow<R, p>>(
		pattern: PatternParam<R, p>,
		build: Build<V>,
	): Handled<p, V> extends infer h
		? OrderMatch<T, Exclude<R, h>, [...H, h]>
		: never;
	/**
	 * Add the next group: the items that match `pattern` and no earlier case,
	 * sorted by `order`. `order` can be for a wider type than the group's.
	 */
	with<const p extends P.Pattern<R>, V extends Narrow<R, p>, S>(
		pattern: PatternParam<R, p>,
		order: Order<S> & ([V] extends [S] ? unknown : never),
	): Handled<p, V> extends infer h
		? OrderMatch<T, Exclude<R, h>, [...H, h]>
		: never;
	/** Add the next group: the items that match `pattern` and pass `guard`. */
	with<
		const p extends P.Pattern<R>,
		guard extends (value: Narrow<R, p>) => unknown,
		V extends GuardValue<guard>,
	>(
		pattern: PatternParam<R, p>,
		guard: guard,
		build: Build<V>,
	): guard extends ((value: any) => value is infer n)
		? OrderMatch<T, Exclude<R, n>, [...H, n]>
		: OrderMatch<T, R, H>;
	/**
	 * Add the next group: the items that match `pattern` and pass `guard`,
	 * sorted by `order`. `order` can be for a wider type than the group's.
	 */
	with<
		const p extends P.Pattern<R>,
		guard extends (value: Narrow<R, p>) => unknown,
		V extends GuardValue<guard>,
		S,
	>(
		pattern: PatternParam<R, p>,
		guard: guard,
		order: Order<S> & ([V] extends [S] ? unknown : never),
	): guard extends ((value: any) => value is infer n)
		? OrderMatch<T, Exclude<R, n>, [...H, n]>
		: OrderMatch<T, R, H>;
	/** Add the next group: the items that match any of the patterns, in no order of their own. */
	with<
		const ps extends readonly [
			P.Pattern<R>,
			P.Pattern<R>,
			...P.Pattern<R>[],
		],
		V extends NarrowAny<R, ps>,
	>(
		...patterns: ps
	): HandledAll<ps, V> extends infer hs extends any[]
		? OrderMatch<T, Exclude<R, hs[number]>, [...H, ...hs]>
		: never;
	/** Add the next group: the items that match any of the patterns. */
	with<
		const ps extends readonly [
			P.Pattern<R>,
			P.Pattern<R>,
			...P.Pattern<R>[],
		],
		V extends NarrowAny<R, ps>,
	>(
		...args: [...patterns: ps, build: Build<V>]
	): HandledAll<ps, V> extends infer hs extends any[]
		? OrderMatch<T, Exclude<R, hs[number]>, [...H, ...hs]>
		: never;
	/** Add the next group: the items that match any of the patterns, sorted by `order`. */
	with<
		const ps extends readonly [
			P.Pattern<R>,
			P.Pattern<R>,
			...P.Pattern<R>[],
		],
		V extends NarrowAny<R, ps>,
		S,
	>(
		...args: [
			...patterns: ps,
			order: Order<S> & ([V] extends [S] ? unknown : never),
		]
	): HandledAll<ps, V> extends infer hs extends any[]
		? OrderMatch<T, Exclude<R, hs[number]>, [...H, ...hs]>
		: never;
	/**
	 * Add the next group: the items that pass `predicate` and no earlier case.
	 * `build`, if given, sorts within the group.
	 */
	when<pred extends (value: R) => unknown, V extends GuardValue<pred>>(
		predicate: pred,
		build?: Build<V>,
	): pred extends ((value: any) => value is infer n)
		? OrderMatch<T, Exclude<R, n>, [...H, n]>
		: OrderMatch<T, R, H>;
	/**
	 * Add the next group: the items that pass `predicate` and no earlier case,
	 * sorted by `order`. `order` can be for a wider type than the group's.
	 */
	when<pred extends (value: R) => unknown, V extends GuardValue<pred>, S>(
		predicate: pred,
		order: Order<S> & ([V] extends [S] ? unknown : never),
	): pred extends ((value: any) => value is infer n)
		? OrderMatch<T, Exclude<R, n>, [...H, n]>
		: OrderMatch<T, R, H>;
	/**
	 * Add a last group for every item that no case matched, and return the
	 * order. `build`, if given, sorts within the group.
	 */
	otherwise(build?: Build<R>): Order<T>;
	/**
	 * Add a last group for every item that no case matched, sorted by `order`,
	 * and return the order. `order` can be for a wider type than the group's.
	 */
	otherwise<S>(
		order: Order<S> & ([R] extends [S] ? unknown : never),
	): Order<T>;
	/**
	 * Return the order. Type-checks that the cases cover every value of `T`:
	 * with a case missing, this is a `NonExhaustiveError` that names the values
	 * left. At runtime an item that matches no case sorts last.
	 */
	exhaustive: DeepExcludeAll<T, H> extends infer left
		? [left] extends [never]
			? () => Order<T>
			: NonExhaustiveError<left>
		: never;
}

/**
 * Build an order from ts-pattern patterns. Each `.with(pattern, build)` adds
 * a group: items that match an earlier case come first, and items that match
 * no case come last. `build`, an `Order` or a callback that gets an empty
 * `Order` of the group's type, sorts the items within the group. Leave it out
 * to keep the group in input order. Steps added after `.exhaustive()` or
 * `.otherwise()` sort ties in every group.
 *
 * Pass an order to sort by its steps before the groups.
 *
 * @example
 * ```ts
 * import { P } from 'ts-pattern';
 * import { match } from 'ts-order/match';
 *
 * const byShape = match<Shape>()
 * 	.with({ kind: 'square' }, (o) => o.by((s) => s.side, { direction: 'desc' }))
 * 	.with({ kind: 'circle' }, (o) => o.by((c) => c.radius))
 * 	.with({ kind: 'triangle' })
 * 	.exhaustive()
 * 	.by((s) => s.id);
 * ```
 */
export function match<T>(order: Order<T> = new Order<T>()): OrderMatch<T, T> {
	return new Builder(order, [], []) as any;
}

class Builder<T> {
	constructor(
		private readonly _order: Order<T>,
		/** The test of each case, in order. Truthy when the case matches. */
		private readonly _tests: readonly ((value: T) => unknown)[],
		/** Each case's build with its check for the case, when it has a build. */
		private readonly _groups: readonly Group<T>[],
	) {}

	with(...args: unknown[]): Builder<T> {
		const last = args.at(-1);
		// A pattern is never a function or an `Order`, so this is the build.
		const within =
			typeof last === 'function' || last instanceof Order
				? (args.pop() as Within<T>)
				: undefined;
		// `(pattern, guard, build)`, as ts-pattern tells it apart: a function is not a pattern.
		const guard =
			args.length === 2 && typeof args[1] === 'function'
				? (args.pop() as (value: T) => unknown)
				: 0;
		const tests = args.map(compilePattern);
		const test =
			tests.length === 1
				? tests[0]!
				: (value: unknown) => tests.some((t) => t(value));
		return guard
			? this._case((value) => test(value) && guard(value), within, false)
			: this._case(test, within, args.every(isPlain));
	}

	when(predicate: (value: T) => unknown, within: Within<T>): Builder<T> {
		return this._case(predicate, within, false);
	}

	otherwise(within: Within<T>): Order<T> {
		return this._case(() => true, within, true).exhaustive();
	}

	/**
	 * Adds a case. `total` says that `test` is safe on any value, as a plain
	 * pattern is, so it can run before the earlier cases' tests and fail fast.
	 */
	private _case(
		test: (value: T) => unknown,
		within: Within<T>,
		total: boolean,
	): Builder<T> {
		const earlier = this._tests;
		const build =
			within instanceof Order ? within : within && within(new Order<T>());
		const inEarlier = (value: T) => {
			for (let i = 0; i < earlier.length; i++)
				if (earlier[i]!(value)) return true;
			return false;
		};
		// First match wins, as in ts-pattern: an item in an earlier group is never
		// in this one, so this group's steps never sort it, and a `.when()` or guard
		// callback never sees it, since its type leaves out the earlier cases.
		const inGroup = total
			? (value: T) => !!test(value) && !inEarlier(value)
			: (value: T) => !inEarlier(value) && !!test(value);
		return new Builder(
			this._order,
			[...earlier, test],
			build ? [...this._groups, { build, inGroup }] : this._groups,
		);
	}

	exhaustive(): Order<T> {
		const tests = this._tests;
		// One step puts the groups in case order: the rank of the first case that
		// matches, or `tests.length` when none does, so those items come last.
		// Fixed, so `reverse()` keeps the group order, as it does for `when()`.
		const group: OrderStep<T> = {
			key: (value) => {
				for (let i = 0; i < tests.length; i++)
					if (tests[i]!(value)) return i;
				return tests.length;
			},
			direction: 1,
			nulls: 1,
			fixed: true,
		};
		// Groups that pass the same `Order` share one copy of its steps. The group
		// step comes first, so only items in the same group reach them.
		const checksByBuild = new Map<Order<T>, ((value: T) => boolean)[]>();
		for (const { build, inGroup } of this._groups) {
			const checks = checksByBuild.get(build);
			if (checks) checks.push(inGroup);
			else checksByBuild.set(build, [inGroup]);
		}
		const steps: OrderStep<T>[] = [];
		for (const [build, checks] of checksByBuild) {
			const inGroup =
				checks.length === 1
					? checks[0]!
					: (value: T) => checks.some((check) => check(value));
			for (const step of build['_steps']) {
				const p = step.predicate;
				steps.push({
					...step,
					predicate: p
						? (value) => p(value) && inGroup(value)
						: inGroup,
				});
			}
		}
		return Order['_from']([...this._order['_steps'], group, ...steps]);
	}
}

type Group<T> = { build: Order<T>; inGroup: (value: T) => boolean };

const matcher = Symbol.for('@ts-pattern/matcher');

/**
 * A test for `pattern` with the same result as ts-pattern's `isMatching`.
 * Literals and plain objects are tested here, about 10 times as fast in
 * `compare`. Arrays and `P` patterns go to `isMatching`.
 */
function compilePattern(pattern: unknown): (value: any) => boolean {
	if (!pattern || typeof pattern !== 'object')
		return (value) => Object.is(value, pattern);
	if (Array.isArray(pattern) || matcher in pattern)
		return isMatching(pattern as P.Pattern<unknown>);
	const object = pattern as Record<PropertyKey, any>;
	const keys = Reflect.ownKeys(object);
	// One key with a literal, such as `{ kind: 'square' }`: the usual case.
	// Without the loop, `compare` is about 12% faster, and compiled `compare` 25%.
	const [first] = keys;
	const literal = first === undefined ? 0 : object[first];
	if (keys.length === 1 && (!literal || typeof literal !== 'object'))
		return (value) =>
			!!value &&
			typeof value === 'object' &&
			first! in value &&
			Object.is(value[first!], literal);
	const tests = keys.map((key) => compilePattern(object[key]));
	// ts-pattern needs every key of the pattern on the value, unless its pattern is `P.optional`.
	const optional = keys.map(
		(key) => object[key]?.[matcher]?.().matcherType === 'optional',
	);
	return (value) => {
		if (!value || typeof value !== 'object') return false;
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]!;
			if (!(optional[i] || key in value) || !tests[i]!(value[key]))
				return false;
		}
		return true;
	};
}

/** Whether `pattern` holds only literals and plain objects, so its test is safe on any value. */
function isPlain(pattern: unknown): boolean {
	if (!pattern || typeof pattern !== 'object') return true;
	if (Array.isArray(pattern) || matcher in pattern) return false;
	const object = pattern as Record<PropertyKey, unknown>;
	return Reflect.ownKeys(object).every((key) => isPlain(object[key]));
}
