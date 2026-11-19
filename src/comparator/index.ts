import type {
	Comparable,
	Comparator,
	KeyOptions,
	KeyOptionsWithCompare,
} from '../types.js';
import { isMissing } from '../missing.js';

/**
 * Convenience alias for `-1`, indicating that `a` should come before `b` inside a comparator function.
 */
export const A_BEFORE_B = -1;
/**
 * Convenience alias for `1`, indicating that `a` should come after `b` inside a comparator function.
 */
export const A_AFTER_B = 1;
/**
 * Convenience alias for `0` indicating that `a` is equal to `b` inside a comparator function.
 */
export const EQUAL = 0;

/**
 * Inverts the result of a comparator so that higher values come first.
 *
 * @example
 * ```ts
 * ['c', 'a', 'b'].sort(reverse(string)); // ['c', 'b', 'a']
 * ```
 */
export function reverse<T>(compareFn: Comparator<T>): Comparator<T> {
	return (a, b) => compareFn(b, a);
}

/**
 * Wraps a comparator so `null` and `undefined` sort before defined values.
 *
 * @example
 * ```ts
 * [null, 'b', 'a'].sort(nullsFirst(string)); // [null, 'a', 'b']
 * ```
 */
export function nullsFirst<T>(
	compareFn: Comparator<T>,
): Comparator<T | null | undefined> {
	return (a, b) => {
		if (a == null && b == null) return 0;
		if (a == null) return -1;
		if (b == null) return 1;
		return compareFn(a, b);
	};
}

/**
 * Wraps a comparator so `null` and `undefined` sort after defined values.
 *
 * @example
 * ```ts
 * ['b', null, 'a'].sort(nullsLast(string)); // ['a', 'b', null]
 * ```
 */
export function nullsLast<T>(
	compareFn: Comparator<T>,
): Comparator<T | null | undefined> {
	return (a, b) => {
		if (a == null && b == null) return 0;
		if (a == null) return 1;
		if (b == null) return -1;
		return compareFn(a, b);
	};
}

/**
 * Wraps a comparator so `NaN` numbers sort before other values.
 *
 * @example
 * ```ts
 * [NaN, 2, 1].sort(nansFirst(number)); // [NaN, 1, 2]
 * ```
 */
export function nansFirst<T>(compareFn: Comparator<T>): Comparator<T> {
	return (a, b) => {
		const isANaN = typeof a === 'number' && Number.isNaN(a);
		const isBNaN = typeof b === 'number' && Number.isNaN(b);
		if (isANaN && isBNaN) return 0;
		if (isANaN) return -1;
		if (isBNaN) return 1;
		return compareFn(a, b);
	};
}

/**
 * Wraps a comparator so `NaN` numbers sort after other values.
 *
 * @example
 * ```ts
 * [2, NaN, 1].sort(nansLast(number)); // [1, 2, NaN]
 * ```
 */
export function nansLast<T>(compareFn: Comparator<T>): Comparator<T> {
	return (a, b) => {
		const isANaN = typeof a === 'number' && Number.isNaN(a);
		const isBNaN = typeof b === 'number' && Number.isNaN(b);
		if (isANaN && isBNaN) return 0;
		if (isANaN) return 1;
		if (isBNaN) return -1;
		return compareFn(a, b);
	};
}

/**
 * Basic three-way comparator using JavaScript relational operators (i.e. `a < b`, `a > b`).
 * Missing values (`null`, `undefined`, `NaN` and invalid dates) sort last.
 *
 * @example
 * ```ts
 * ['b', 'a', 'c'].sort(compare); // ['a', 'b', 'c']
 * [2, undefined, 1].sort(compare); // [1, 2, undefined]
 * ```
 */
export function compare<T extends Comparable>(a: T, b: T): number {
	// Check missing values first: `null` compares as 0 with `<` and `>`.
	return compareMissing(a, b, 1) || ((a as any) < (b as any) ? -1 : (a as any) > (b as any) ? 1 : 0);
}

/** Order two values by whether they are missing: 0 when both or neither are. */
function compareMissing(a: unknown, b: unknown, nulls: 1 | -1): number {
	const missingA = isMissing(a);
	if (missingA === isMissing(b)) return 0;
	return missingA ? nulls : -nulls;
}

/**
 * String comparator alias for `compare`.
 *
 * @example
 * ```ts
 * ['b', 'a', 'c'].sort(string); // ['a', 'b', 'c']
 * ```
 */
export { compare as string };

/**
 * Locale-aware string comparator using `Intl.Collator`.
 *
 * @example
 * ```ts
 * ['ä', 'a', 'z'].sort(localeString); // ['a', 'ä', 'z'] in de-DE locale
 * ```
 */
export function localeString(a: string, b: string): number {
	return a.localeCompare(b);
}

/**
 * Numeric comparator that places `NaN` after all other numbers.
 *
 * @example
 * ```ts
 * [3, NaN, 1].sort(number); // [1, 3, NaN]
 * ```
 */
export function number(a: number, b: number) {
	const isANaN = Number.isNaN(a);
	const isBNaN = Number.isNaN(b);

	if (isANaN && isBNaN) return 0;
	if (isANaN) return 1;
	if (isBNaN) return -1;

	// Not `a - b`: `Infinity - Infinity` is NaN.
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Boolean comparator treating `false` as 0 and `true` as 1.
 *
 * @example
 * ```ts
 * [true, false].sort(boolean); // [false, true]
 * ```
 */
export function boolean(a: boolean, b: boolean) {
	return Number(a) - Number(b);
}

/**
 * Date comparator that places invalid dates after all valid dates.
 *
 * @example
 * ```ts
 * [new Date('2020'), new Date('2010')].sort(date); // [2010, 2020]
 * ```
 */
export function date(a: Date, b: Date) {
	const aTime = a.getTime();
	const bTime = b.getTime();

	const isANaN = Number.isNaN(aTime);
	const isBNaN = Number.isNaN(bTime);

	if (isANaN && isBNaN) return 0;
	if (isANaN) return 1;
	if (isBNaN) return -1;

	return aTime - bTime;
}

/**
 * Builds a comparator by projecting values through `key` before comparing.
 *
 * @example
 * ```ts
 * // sorts users by age ascending
 * users.sort(by(user => user.age));
 * ```
 */
export function by<T, K extends Comparable>(
	key: (v: T) => K,
	options?: KeyOptions<K, T>,
): Comparator<T>;
export function by<T, K>(
	key: (v: T) => K,
	options: KeyOptionsWithCompare<K, T>,
): Comparator<T>;
export function by<T, K>(
	key: (v: T) => K,
	options?: KeyOptions<K, T>,
): Comparator<T> {
	const custom = options?.compare;
	const compareFn = custom ?? (compare as Comparator<K>);
	const predicate = options?.predicate;
	const compareFnWithDirection =
		options?.direction === 'desc' ? reverse(compareFn) : compareFn;
	// Handle missing keys before the direction applies, so `desc` does not move them.
	// A custom comparator with no `nulls` option receives missing keys unchanged.
	const nulls
		= options?.nulls === 'first' ? -1 : options?.nulls || !custom ? 1 : 0;
	const compareKeys: Comparator<K> = nulls
		? (x, y) =>
				compareMissing(x, y, nulls) || (isMissing(x) ? 0 : compareFnWithDirection(x, y))
		: compareFnWithDirection;
	const byKey: Comparator<T> = (a, b) => compareKeys(key(a), key(b));

	return predicate ? when(predicate, byKey) : byKey;
}

/**
 * Chains comparators, returning the first non-zero comparison result.
 *
 * @example
 * ```ts
 * // Sort users by last name, then first name
 * users.sort(
 *   order(
 *     by((u) => u.last),
 *     by((u) => u.first),
 *   ),
 * );
 * ```
 */
export function order<T>(...comparators: Comparator<T>[]): Comparator<T> {
	return (a, b) => {
		for (let i = 0; i < comparators.length; i++) {
			const r = comparators[i]!(a, b);
			// NaN is falsy, so a NaN result counts as a tie.
			if (r) return r;
		}

		return 0;
	};
}

/**
 * Adapts a comparator to work on mapped values.
 *
 * @example
 * ```ts
 * // Sort strings by their length
 * ['aa', 'b'].sort(map((value: string) => value.length)); // ['b', 'aa']
 * ```
 */
export function map<T, U extends Comparable>(
	map: (value: T) => U,
	compareFn?: Comparator<U>,
): Comparator<T>;
export function map<T, U>(
	map: (value: T) => U,
	compareFn: Comparator<U>,
): Comparator<T>;
export function map<T, U>(
	map: (value: T) => U,
	compareFn: Comparator<U> = compare as Comparator<U>,
): Comparator<T> {
	return (a, b) => compareFn(map(a), map(b));
}

/**
 * Runs a comparator only when both values satisfy a predicate.
 *
 * @example
 * ```ts
 * people.sort(
 *   when(
 *     (person) => person.age >= 18,
 *     by((person) => person.age),
 *   ),
 * );
 * ```
 */
export function when<T>(
	predicate: (v: T) => boolean,
	compareFn: Comparator<T>,
): Comparator<T> {
	return (a, b) => {
		// The value that passes comes first. When neither passes, the values tie.
		const failsA = !predicate(a);
		const failsB = !predicate(b);
		if (failsA !== failsB) return failsA ? 1 : -1;
		return failsA ? 0 : compareFn(a, b);
	};
}
