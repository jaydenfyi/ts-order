/* eslint-disable unicorn/no-new-array */

import type { Comparator, Direction, KeyOptions } from './types.js';

/** Direction sign for the given order step. 1 for "asc", -1 for "desc" */
type DirectionSign = 1 | -1;

/** Internal representation of a single order step. */
type OrderStep<T> = {
        key: (t: T) => unknown;
        direction: DirectionSign;
        compare?: Comparator<unknown> | undefined;
        predicate?: ((value: T) => boolean) | undefined;
};

type NoInfer<T> = [T][T extends any ? 0 : never];

type ConditionalOrderChain<T, Remaining> = Order<T> & {
        readonly _orderRemaining?: (_: Remaining) => Remaining;
};

const mergeConditionalPredicates = <T>(
        existing: ((value: T) => boolean) | undefined,
        next: (value: T) => boolean,
): ((value: T) => boolean) => {
        if (!existing) return next;
        return (value: T) => existing(value) || next(value);
};

const directionSignByDirection = {
	asc: 1,
	desc: -1,
} as const satisfies Record<Direction, DirectionSign>;

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
        private _steps: OrderStep<T>[] = [];
        private _conditionalGuard?: (value: T) => boolean;

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
		if (!sourceOrSources) {
			return;
		}
		if (Symbol.iterator in new Object(sourceOrSources)) {
			for (const s of sourceOrSources as Iterable<
				Order<T> | null | undefined
			>) {
				if (!s || s._steps.length === 0) continue;

				for (let i = 0; i < s._steps.length; i++) {
					this._steps.push(s._steps[i]!);
				}
			}
			return;
		}

                for (let i = 0; i < (sourceOrSources as Order<T>)._steps.length; i++) {
                        this._steps.push((sourceOrSources as Order<T>)._steps[i]!);
                }
                this._conditionalGuard = (sourceOrSources as Order<T>)._conditionalGuard;
        }

	/**
	 * Create a new order with a single sort step.
	 *
	 * @example
	 * ```ts
	 * const byCreatedAt = Order.by((u: User) => u.createdAt, {
	 * 	direction: 'desc',
	 * });
	 * ```
	 */
	static by<T, K>(
		selectorFn: (item: T) => K,
		options?: KeyOptions<K, T>,
	): Order<T> {
		const order = new Order<T>();
		const direction = directionSignByDirection[options?.direction ?? 'asc'];
		const compare = options?.compare as Comparator<unknown>;
		order._assignSteps([
			{
				key: selectorFn as (t: T) => unknown,
				direction,
				compare,
				predicate: options?.predicate,
			},
		]);

		return order;
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
	by<K>(selectorFn: (item: T) => K, options?: KeyOptions<K, T>): Order<T> {
		const nextOrder = new Order<T>();
		const direction = directionSignByDirection[options?.direction ?? 'asc'];
		const compare = options?.compare as Comparator<unknown>;
		nextOrder._assignSteps([
			...this._steps,
			{
				key: selectorFn,
				direction,
				compare,
				predicate: options?.predicate,
			},
		]);

		return nextOrder;
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
		if (input._steps.length === 0) return new Order<T>();
		const reversedOrder = new Order<T>();
		reversedOrder._assignSteps(
			input._steps.map((s) => ({
				key: s.key,
				direction: s.direction === 1 ? -1 : 1,
				compare: s.compare,
				predicate: s.predicate,
			})),
		);

		return reversedOrder;
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
		return Order.reverse(this);
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
		if (sub._steps.length === 0) return new Order<T>();
		const mappedOrder = new Order<T>();
		mappedOrder._assignSteps(
			sub._steps.map<OrderStep<T>>((s) => ({
				key: (t: T) => s.key(outer(t)),
				direction: s.direction,
				compare: s.compare,
				predicate: s.predicate
					? (t: T) => s.predicate!(outer(t))
					: undefined,
			})),
		);

		return mappedOrder;
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
        static when<T, Narrow extends T>(
                predicate: (value: T) => value is Narrow,
                input:
                        | Order<Narrow>
                        | ((order: Order<NoInfer<Narrow>>) => Order<Narrow>),
        ): ConditionalOrderChain<T, Exclude<T, Narrow>>;
        static when<T>(
                predicate: (value: T) => boolean,
                input: Order<T> | ((order: Order<T>) => Order<T>),
        ): ConditionalOrderChain<T, T>;
        static when<T>(
                predicate: (value: T) => boolean,
                input: Order<T> | ((order: Order<T>) => Order<T>),
        ): ConditionalOrderChain<T, any> {
                const built = Order._resolveConditionalInput(
                        input as Order<T> | ((order: Order<T>) => Order<T>),
                );

                if (built._steps.length === 0) {
                        return new Order<T>() as unknown as ConditionalOrderChain<T, any>;
                }
                const guardedOrder = new Order<T>();
                guardedOrder._assignSteps(
                        built._steps.map((step) => {
                                const stepPredicate = step.predicate as
                                        | ((value: T) => boolean)
                                        | undefined;
                                return {
                                        key: step.key as (t: T) => unknown,
                                        direction: step.direction,
                                        compare: step.compare,
                                        predicate: stepPredicate
                                                ? (value: T) => stepPredicate(value) && predicate(value)
                                                : predicate,
                                } satisfies OrderStep<T>;
                        }),
                );

                guardedOrder._conditionalGuard = predicate as (value: T) => boolean;

                return guardedOrder as unknown as ConditionalOrderChain<T, any>;
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
		if (this._steps.length === 0) return Order.map(outer, sub);
		const mappedOrder = Order.map(outer, sub);
		const nextOrder = new Order<T>();
		nextOrder._assignSteps([...this._steps, ...mappedOrder._steps]);

		return nextOrder;
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
        when<Remaining extends T, Narrow extends Remaining>(
                this: ConditionalOrderChain<T, Remaining>,
                predicate: (value: T) => value is Narrow,
                order:
                        | Order<Narrow>
                        | ((order: Order<NoInfer<Narrow>>) => Order<Narrow>),
        ): ConditionalOrderChain<T, Exclude<Remaining, Narrow>>;
        when<Remaining extends T>(
                this: ConditionalOrderChain<T, Remaining>,
                predicate: (value: T) => boolean,
                order: Order<Remaining> | ((order: Order<Remaining>) => Order<Remaining>),
        ): ConditionalOrderChain<T, Remaining>;
        when<Remaining extends T>(
                this: ConditionalOrderChain<T, Remaining>,
                predicate: (value: T) => boolean,
                order: Order<Remaining> | ((order: Order<Remaining>) => Order<Remaining>),
        ): ConditionalOrderChain<T, any> {
                const normalized = Order._resolveConditionalInput(
                        order as Order<Remaining> | ((order: Order<Remaining>) => Order<Remaining>),
                );
                const guarded = Order.when(
                        predicate,
                        normalized,
                ) as unknown as ConditionalOrderChain<T, Remaining>;
                const nextConditionalGuard = mergeConditionalPredicates(
                        this._conditionalGuard,
                        predicate as (value: T) => boolean,
                );
                if (this._steps.length === 0) {
                        (guarded as Order<T>)._conditionalGuard = nextConditionalGuard;
                        return guarded as ConditionalOrderChain<T, any>;
                }
                const guardedSteps = (guarded as Order<T>)._steps;
                if (guardedSteps.length === 0) {
                        const clone = new Order<T>(this);
                        clone._conditionalGuard = this._conditionalGuard;
                        return clone as unknown as ConditionalOrderChain<T, any>;
                }
                const nextOrder = new Order<T>();
                nextOrder._assignSteps([...this._steps, ...guardedSteps]);
                nextOrder._conditionalGuard = nextConditionalGuard;
                return nextOrder as unknown as ConditionalOrderChain<T, any>;
        }

        otherwise<Remaining extends T>(
                this: ConditionalOrderChain<T, Remaining>,
                order: Order<Remaining>,
        ): Order<T> {
                const fallbackSteps = order._steps;
                if (fallbackSteps.length === 0) {
                        const clone = new Order<T>(this);
                        clone._conditionalGuard = undefined;
                        return clone;
                }

                const guard = this._conditionalGuard;
                const fallbackPredicate: (value: T) => boolean = guard
                        ? (value: T) => !guard(value)
                        : () => true;

                const projectedFallbackSteps = fallbackSteps.map<OrderStep<T>>((step) => {
                        const stepPredicate = step.predicate as
                                | ((value: Remaining) => boolean)
                                | undefined;
                        const predicate = stepPredicate
                                ? (value: T) =>
                                          stepPredicate(value as Remaining) && fallbackPredicate(value)
                                : fallbackPredicate;

                        return {
                                key: step.key as (value: T) => unknown,
                                direction: step.direction,
                                compare: step.compare,
                                predicate,
                        } satisfies OrderStep<T>;
                });

                const nextOrder = new Order<T>();
                nextOrder._assignSteps([...this._steps, ...projectedFallbackSteps]);

                return nextOrder;
        }

        exhaustive(this: ConditionalOrderChain<T, never>): Order<T> {
                return this;
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
		if (numberOfSteps === 0) return () => 0;

		// @codegen inlineCompareSteps(16)

		return (a: T, b: T): number => {
			for (let i = 0; i < numberOfSteps; i++) {
				const s = steps[i]!;
				const p = s.predicate;
				if (p && (!p(a) || !p(b))) continue;
				const x = s.key(a);
				const y = s.key(b);
				const c = s.compare;
				if (c) {
					const r = c(x, y);
					if (r !== 0) return r > 0 ? s.direction : -s.direction;
				} else {
					if ((x as any) < (y as any)) return -s.direction;
					if ((x as any) > (y as any)) return s.direction;
				}
			}

			return 0;
		};
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
	static sort<T>(array: readonly T[], order: Order<T>): T[] {
		const steps = order._steps;
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
					const match = predicate(item);
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

		// ---------- Unified comparator-aware DSU comparator (explicit ifs for 1..5) ----------
		const dirs = new Int8Array(numberOfSteps);
		const cmps = new Array<Comparator<unknown> | undefined>(numberOfSteps);
		for (let j = 0; j < numberOfSteps; j++) {
			dirs[j] = steps[j]!.direction;
			cmps[j] = steps[j]!.compare;
		}

		// @codegen inlineSortSteps(16)

		arrayIndexes.sort((ia, ib) => {
			for (let j = 0; j < numberOfSteps; j++) {
				const kj = keysPerStep[j]!;
				const matches = predicateMatchesPerStep[j];
				if (matches && (!matches[ia] || !matches[ib])) continue;
				const a = kj[ia];
				const b = kj[ib];
				const c = cmps[j];
				const d = dirs[j] as 1 | -1;

				if (c) {
					const r = c(a, b);
					if (r !== 0) return r > 0 ? d : -d;
				} else {
					if ((a as any) < (b as any)) return -d;
					if ((a as any) > (b as any)) return d;
				}
			}

			return 0;
		});

		const out: T[] = new Array(arrayLength);
		for (let i = 0; i < arrayLength; i++) out[i] = array[arrayIndexes[i]!]!;
		return out;
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
        sort(array: readonly T[]): T[] {
                return Order.sort(array, this);
        }

        private static _resolveConditionalInput<S>(
                input: Order<S> | ((order: Order<NoInfer<S>>) => Order<S>),
        ): Order<S> {
                if (typeof input === 'function') {
                        return (input as (order: Order<S>) => Order<S>)(new Order<S>());
                }

                return input;
        }

        /** Replace the internal step list with provided steps. */
        private _assignSteps(steps: OrderStep<T>[]): void {
                this._steps = steps;
        }
}
