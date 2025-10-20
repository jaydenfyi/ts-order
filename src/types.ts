/**
 * Sort direction flag used by comparator helpers.
 *
 * @example
 * ```ts
 * const direction: Direction = 'asc';
 * ```
 */
export type Direction = 'asc' | 'desc';

/**
 * Generic comparator signature that can be used with Array.prototype.sort, or to the `compare` prop of `Order.by()`.
 *
 * @example
 * ```ts
 * const localeCompare: Comparator<string> = (a, b) => a.localeCompare(b);
 * ```
 */
export type Comparator<T> = (a: T, b: T) => number;

export type KeyOptions<K, T = unknown> = {
	/**
	 * Direction for this step.
	 *
	 * @defaultValue "asc"
	 */
	direction?: Direction;

	/**
	 * Custom comparator for this key's values. Defaults a three-way comparison when not provided.
	 * @example
	 * ```ts
	 * const comparator = Order.by((item: Item) => item.name, {
	 *   compare: (a, b) => a.localeCompare(b),
	 * });
	 * ```
	 */
	compare?: Comparator<K>;
	/**
	 * Optional predicate that must be satisfied by both values for this step to run.
	 * @example
	 * ```ts
	 * const comparator = Order.by((item: Item) => item.score, {
	 *   predicate: (item) => item.isActive,
	 * });
	 * ```
	 */
	predicate?: (value: T) => boolean;
};
