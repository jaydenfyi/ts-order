/* eslint-disable unicorn/no-new-array */

import type {
	Comparable,
	Comparator,
	KeyOptions,
	KeyOptionsWithCompare,
} from './types.js';
import { isMissing } from './missing.js';

/** Direction sign for the given order step. 1 for "asc", -1 for "desc" */
type DirectionSign = 1 | -1;

/** Internal representation of a single order step. */
type OrderStep<T> = {
	key: (t: T) => unknown;
	direction: DirectionSign;
	compare?: Comparator<unknown> | undefined;
	predicate?: ((value: T) => boolean) | undefined;
	/**
	 * Where missing keys go: 1 after the other keys, -1 before them, in both
	 * directions. Undefined only for a custom comparator with no `nulls` option,
	 * which then receives missing keys unchanged.
	 */
	nulls?: DirectionSign | undefined;
};

/**
 * Builder for immutable multi-step ordering rules.
 *
 * Create an `Order`, chain `.by()` calls to describe each step, then use
 * `.compare` with `Array.prototype.sort` or call `.sort()` for DSU-style sorting
 * that evaluates keys only once per step.
 *
 * @example
 * ```ts
 * const byStatusThenName = new Order<User>()
 * 	.by((u) => u.isActive, { direction: 'desc' })
 * 	.by((u) => u.lastName)
 * 	.by((u) => u.firstName);
 *
 * users.sort(byStatusThenName.compare);
 * ```
 */
export class Order<T> {
	/** Steps never change after an order exists, so orders share these arrays. */
	private _steps: readonly OrderStep<T>[] = [];
	private _compare: Comparator<T> | undefined;
	/** Per-step directions and comparators for `sort`, built on first use. */
	private _sortPlan:
		| { dirs: DirectionSign[]; cmps: (Comparator<unknown> | undefined)[] }
		| undefined;

	/**
	 * Create a new order. When a source or iterable of sources is provided, the
	 * new order copies every step from the input.
	 *
	 * @example
	 * ```ts
	 * // Create an empty order and append steps to it:
	 * const base = new Order<User>();
	 * const byScore = base.by((u) => u.score);
	 *
	 * // Or combine multiple orders together:
	 * const byScoreThenId = new Order([base, Order.by((u: User) => u.id)]);
	 * ```
	 */
	constructor();
	constructor(source: Order<T> | null | undefined);
	constructor(sources: Iterable<Order<T> | null | undefined>);

	constructor(
		sourceOrSources?:
			| Order<T>
			| Iterable<Order<T> | null | undefined>
			| null
			| undefined,
	) {
		if (!sourceOrSources) return;
		// Not `instanceof`: an order from another copy of this package must work too.
		if (!(Symbol.iterator in sourceOrSources)) {
			this._steps = sourceOrSources._steps;
			return;
		}
		const steps: OrderStep<T>[] = [];
		for (const source of sourceOrSources) {
			if (source) steps.push(...source._steps);
		}
		this._steps = steps;
	}

	/** Create an order from a steps array that no one else will change. */
	private static _from<T>(steps: readonly OrderStep<T>[]): Order<T> {
		const order = new Order<T>();
		order._steps = steps;
		return order;
	}

	/**
	 * Create a new order with a single sort step. Without a `compare` option,
	 * keys compare with `<` and `>`, and missing keys (`null`, `undefined`, `NaN`
	 * and invalid dates) sort last.
	 *
	 * @example
	 * ```ts
	 * const byCreatedAt = Order.by((u: User) => u.createdAt, {
	 * 	direction: 'desc',
	 * });
	 * ```
	 */
	static by<T, K extends Comparable>(
		selectorFn: (item: T) => K,
		options?: KeyOptions<K, T>,
	): Order<T>;
	/**
	 * Create a new order with a single sort step, for a key of any type. The
	 * `compare` option orders the keys.
	 *
	 * @example
	 * ```ts
	 * const byAddress = Order.by((c: Customer) => c.address, {
	 * 	compare: (a, b) => a.city.localeCompare(b.city),
	 * });
	 * ```
	 */
	static by<T, K>(
		selectorFn: (item: T) => K,
		options: KeyOptionsWithCompare<K, T>,
	): Order<T>;
	static by<T, K>(
		selectorFn: (item: T) => K,
		options?: KeyOptions<K, T>,
	): Order<T> {
		return new Order<T>().by(selectorFn, options as KeyOptionsWithCompare<K, T>);
	}

	/**
	 * Append a sort step and return a new order instance.
	 *
	 * @example
	 * ```ts
	 * const byCreatedThenId = new Order<User>()
	 * 	.by((u) => u.createdAt)
	 * 	.by((u) => u.id);
	 * ```
	 */
	by<K extends Comparable>(
		selectorFn: (item: T) => K,
		options?: KeyOptions<K, T>,
	): Order<T>;
	/**
	 * Append a sort step for a key of any type, and return a new order
	 * instance. The `compare` option orders the keys.
	 *
	 * @example
	 * ```ts
	 * const byIdThenAddress = new Order<Customer>()
	 * 	.by((c) => c.id)
	 * 	.by((c) => c.address, { compare: (a, b) => a.city.localeCompare(b.city) });
	 * ```
	 */
	by<K>(
		selectorFn: (item: T) => K,
		options: KeyOptionsWithCompare<K, T>,
	): Order<T>;
	by<K>(selectorFn: (item: T) => K, options?: KeyOptions<K, T>): Order<T> {
		return Order._from([
			...this._steps,
			{
				key: selectorFn,
				direction: options?.direction === 'desc' ? -1 : 1,
				compare: options?.compare as Comparator<unknown> | undefined,
				predicate: options?.predicate,
				nulls:
					options?.nulls === 'first'
						? -1
						: options?.nulls || !options?.compare
							? 1
							: undefined,
			},
		]);
	}

	/**
	 * Flip the direction of every step in an order.
	 *
	 * @example
	 * ```ts
	 * const newestFirst = Order.reverse(Order.by((u: User) => u.createdAt));
	 * ```
	 */
	static reverse<T>(input: Order<T>): Order<T> {
		return input.reverse();
	}

	/**
	 * Flip the direction of every step in this order.
	 *
	 * @example
	 * ```ts
	 * const newestFirst = Order.by((u: User) => u.createdAt).reverse();
	 * ```
	 */
	reverse(): Order<T> {
		return Order._from(
			this._steps.map((s) => ({ ...s, direction: s.direction === 1 ? -1 : 1 })),
		);
	}

	/**
	 * Lifts an order defined for a derived or nested value into the parent domain.
	 * The provided mapping function extracts the inner value, and the given order
	 * is applied to that value when comparing parent items.
	 *
	 * @example
	 * ```ts
	 * interface Address {
	 * 	city: string;
	 * 	postcode: string;
	 * }
	 * interface Customer {
	 * 	id: number;
	 * 	address: Address;
	 * }
	 * const byAddress = Order.by((a: Address) => a.city).by((a) => a.postcode);
	 * const byCustomerAddress = Order.map((c: Customer) => c.address, byAddress);
	 * ```
	 */
	static map<T, K>(outer: (t: T) => K, sub: Order<K>): Order<T> {
		return new Order<T>().map(outer, sub);
	}

	/**
	 * Appends additional sort steps that only apply when both compared items satisfy the given predicate.
	 * If either item fails the predicate, the appended steps are skipped and sorting continues
	 * with the next step in the current `Order`.
	 *
	 * @example
	 * ```ts
	 * const euPriority = Order.when(
	 * 	(u: User) => u.region === 'eu',
	 * 	Order.by((u: User) => u.score, { direction: 'desc' }),
	 * );
	 * ```
	 */
	static when<T>(
		predicate: (value: T) => boolean,
		input: Order<T>,
	): Order<T> {
		return new Order<T>().when(predicate, input);
	}

	/**
	 * Lifts an order defined for a derived or nested value into the parent domain.
	 * The provided mapping function extracts the inner value, and the given order
	 * is applied to that value when comparing parent items.
	 *
	 * @example
	 * ```ts
	 * interface Address {
	 * 	city: string;
	 * 	postcode: string;
	 * }
	 * interface Customer {
	 * 	id: number;
	 * 	address: Address;
	 * }
	 * const byIdThenAddress = new Order<Customer>()
	 * 	.by((c) => c.id)
	 * 	.map((c) => c.address, byAddress);
	 * ```
	 */
	map<K>(outer: (t: T) => K, sub: Order<K>): Order<T> {
		return Order._from([
			...this._steps,
			...sub._steps.map((s): OrderStep<T> => {
				const p = s.predicate;
				return {
					...s,
					key: (t) => s.key(outer(t)),
					predicate: p && ((t) => p(outer(t))),
				};
			}),
		]);
	}

	/**
	 * Appends additional sort steps that only apply when both compared items satisfy the given predicate.
	 * If either item fails the predicate, the appended steps are skipped and sorting continues
	 * with the next step in the current `Order`.
	 *
	 * @example
	 * ```ts
	 * const byRegion = new Order<User>()
	 * 	.by((u) => u.region)
	 * 	.when(
	 * 		(u) => u.region === 'eu',
	 * 		Order.by((u) => u.score, { direction: 'desc' }),
	 * 	)
	 * 	// Append a final tiebreaker (runs for all items)
	 *	.by((u) => u.id);
	 * ```
	 */
	when(predicate: (value: T) => boolean, order: Order<T>): Order<T> {
		return Order._from([
			...this._steps,
			...order._steps.map((step) => {
				const p = step.predicate;
				return {
					...step,
					predicate: p ? (value: T) => p(value) && predicate(value) : predicate,
				};
			}),
		]);
	}

	/**
	 * Retrieve a comparator compatible with `Array.prototype.sort`.
	 *
	 * @example
	 * ```ts
	 * users.sort(Order.by((u: User) => u.id).compare);
	 * ```
	 */
	get compare(): Comparator<T> {
		const steps = this._steps;
		const numberOfSteps = steps.length;

		return (this._compare ??= (a: T, b: T): number => {
			for (let i = 0; i < numberOfSteps; i++) {
				const s = steps[i]!;
				const p = s.predicate;
				if (p) {
					// The item that passes comes first. When neither passes, skip the step.
					const failsA = !p(a);
					if (failsA !== !p(b)) return failsA ? 1 : -1;
					if (failsA) continue;
				}
				const x = s.key(a);
				const y = s.key(b);
				const c = s.compare;
				const n = s.nulls;
				if (c) {
					if (n) {
						const missingX = isMissing(x);
						if (missingX !== isMissing(y)) return missingX ? n : -n;
						if (missingX) continue;
					}
					const r = c(x, y);
					// Compare against 0 both ways so that a NaN result counts as a tie.
					if (r > 0) return s.direction;
					if (r < 0) return -s.direction;
				} else {
					// Fast path. `null` compares as 0 with `<` and `>`, so it takes the slow path.
					// `undefined` and NaN reach the slow path because `<` and `>` both return false.
					if (x !== null && y !== null) {
						if ((x as any) < (y as any)) return -s.direction;
						if ((x as any) > (y as any)) return s.direction;
						if (x === y) continue;
					}
					// Slow path: nullish, NaN, an invalid date, or equal values that are not ===.
					const missingX = isMissing(x);
					if (missingX !== isMissing(y)) return missingX ? n! : -n!;
				}
			}

			return 0;
		});
	}

	/**
	 * Sort an array with the provided order and return a new array.
	 *
	 * This method implements the Schwartzian Transform or DSU
	 * (decorate-sort-undecorate) technique, which ensures that each key
	 * selector is only invoked once per element per step. For larger arrays or
	 * costly key computations, this can yield significant performance
	 * improvements over repeatedly calling the selector during comparisons.
	 *
	 * @example
	 * ```ts
	 * const out = Order.sort(users, Order.by((u: User) => u.lastName));
	 * ```
	 */
	static sort<T, U extends T>(array: readonly U[], order: Order<T>): U[] {
		return order.sort(array);
	}

	/**
	 * Sort an array with the provided order and return a new array.
	 *
	 * This method implements the Schwartzian Transform or DSU
	 * (decorate-sort-undecorate) technique, which ensures that each key
	 * selector is only invoked once per element per step. For larger arrays or
	 * costly key computations, this can yield significant performance
	 * improvements over repeatedly calling the selector during comparisons.
	 *
	 * @example
	 * ```ts
	 * const sorted = Order.by((u: User) => u.lastName).sort(users);
	 * ```
	 */
	sort<U extends T>(array: readonly U[]): U[] {
		const steps = this._steps;
		const arrayLength = array.length;

		if (arrayLength <= 1) return array.slice();
		if (steps.length === 0) return array.slice();

		const numberOfSteps = steps.length;

		// ---------- Always DSU: precompute keys for every step ----------
		const keysPerStep: unknown[][] = new Array(numberOfSteps);
		const predicateMatchesPerStep: (boolean[] | undefined)[] = new Array(
			numberOfSteps,
		);
		for (let j = 0; j < numberOfSteps; j++) {
			const step = steps[j]!;
			const keys = new Array(arrayLength);
			const predicate = step.predicate;
			if (predicate) {
				const matches = new Array(arrayLength);
				for (let i = 0; i < arrayLength; i++) {
					const item = array[i]!;
					const match = !!predicate(item);
					matches[i] = match;
					if (match) keys[i] = step.key(item);
				}
				predicateMatchesPerStep[j] = matches;
			} else {
				for (let i = 0; i < arrayLength; i++) {
					keys[i] = step.key(array[i]!);
				}
			}
			keysPerStep[j] = keys;
		}

		const arrayIndexes: number[] = new Array(arrayLength);
		for (let i = 0; i < arrayLength; i++) arrayIndexes[i] = i;

		const { dirs, cmps } = (this._sortPlan ??= {
			dirs: steps.map((step) => step.direction),
			cmps: steps.map((step) => step.compare),
		});

		// The same rules as `compare`, on the precomputed keys.
		const compareIndexes = (ia: number, ib: number): number => {
			for (let j = 0; j < numberOfSteps; j++) {
				const matches = predicateMatchesPerStep[j];
				if (matches) {
					const matchA = matches[ia];
					if (matchA !== matches[ib]) return matchA ? -1 : 1;
					if (!matchA) continue;
				}
				const kj = keysPerStep[j]!;
				const a = kj[ia];
				const b = kj[ib];
				const c = cmps[j];
				const d = dirs[j]!;

				if (c) {
					const n = steps[j]!.nulls;
					if (n) {
						const missingA = isMissing(a);
						if (missingA !== isMissing(b)) return missingA ? n : -n;
						if (missingA) continue;
					}
					const r = c(a, b);
					if (r > 0) return d;
					if (r < 0) return -d;
				} else {
					// The same fast and slow path as `compare`.
					if (a !== null && b !== null) {
						if ((a as any) < (b as any)) return -d;
						if ((a as any) > (b as any)) return d;
						if (a === b) continue;
					}
					const missingA = isMissing(a);
					if (missingA !== isMissing(b)) return missingA ? steps[j]!.nulls! : -steps[j]!.nulls!;
				}
			}

			return 0;
		};
		arrayIndexes.sort(compareIndexes);

		const out: U[] = new Array(arrayLength);
		for (let i = 0; i < arrayLength; i++) out[i] = array[arrayIndexes[i]!]!;
		return out;
	}
}
