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

/**
 * A key type that the default comparison can order with `<` and `>`. `null`,
 * `undefined`, `NaN` and invalid dates are missing keys (see `nulls`). Any
 * other key type needs a `compare` option.
 *
 * An object whose `valueOf()` returns a number or a bigint is also
 * `Comparable`, because `<` and `>` compare those numbers. Examples are Luxon,
 * dayjs and moment dates. An object whose `valueOf()` returns a string, such
 * as a decimal.js value, needs a `compare` option: `"10" < "9"` is true.
 *
 * The default comparison expects one kind of value per key. A key of type
 * `string | number` can sort in an unexpected order.
 *
 * @example
 * ```ts
 * const key: Comparable = new Date();
 * ```
 */
export type Comparable =
	| string
	| number
	| bigint
	| boolean
	| Date
	| { valueOf: () => number | bigint }
	| null
	| undefined;

/**
 * `KeyOptions` that include a `compare` option. A key of any type needs this.
 *
 * @example
 * ```ts
 * const options: KeyOptionsWithCompare<Address> = {
 *   compare: (a, b) => a.city.localeCompare(b.city),
 * };
 * ```
 */
export type KeyOptionsWithCompare<K, T = unknown> = KeyOptions<K, T> & {
	compare: Comparator<K>;
};

/**
 * Options for one sort step of `Order.by` or the comparator `by`. `K` is the
 * key type and `T` is the item type.
 *
 * @example
 * ```ts
 * const options: KeyOptions<number, User> = { direction: 'desc', nulls: 'first' };
 * const byAge = Order.by((user: User) => user.age, options);
 * ```
 */
export type KeyOptions<K, T = unknown> = {
	/**
	 * Direction for this step.
	 *
	 * @defaultValue "asc"
	 */
	direction?: Direction | undefined;

	/**
	 * Custom comparator for this key's values. Defaults to a three-way comparison when not provided, which needs a `Comparable` key.
	 * @example
	 * ```ts
	 * const comparator = Order.by((item: Item) => item.name, {
	 *   compare: (a, b) => a.localeCompare(b),
	 * });
	 * ```
	 */
	compare?: Comparator<K> | undefined;
	/**
	 * Optional predicate that must be satisfied by both values for this step to run.
	 * @example
	 * ```ts
	 * const comparator = Order.by((item: Item) => item.score, {
	 *   predicate: (item) => item.isActive,
	 * });
	 * ```
	 */
	predicate?: ((value: T) => boolean) | undefined;
	/**
	 * Where missing keys go: `null`, `undefined`, `NaN` and invalid dates.
	 * `direction` does not move them. Missing keys tie with each other, so the
	 * next step decides their order.
	 *
	 * With a custom `compare` and no `nulls` option, the comparator receives
	 * missing keys unchanged.
	 *
	 * @defaultValue "last"
	 * @example
	 * ```ts
	 * const byAge = Order.by((user: User) => user.age, { nulls: 'first' });
	 * ```
	 */
	nulls?: 'first' | 'last' | undefined;
};
