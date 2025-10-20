import type { Comparator, KeyOptions } from '../types.js';

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
 * const safe = nansFirst(number);
 * [NaN, 2, 1].sort(safe); // [NaN, 1, 2]
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
 * const safe = nansLast(number);
 * [2, NaN, 1].sort(safe); // [1, 2, NaN]
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
 * Basic comparator using JavaScript relational operators.
 *
 * @example
 * ```ts
 * ['b', 'a', 'c'].sort(compare); // ['a', 'b', 'c']
 * ```
 */
export function compare<T>(a: T, b: T): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
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
 * Numeric comparator that places `NaN` before finite numbers.
 *
 * @example
 * ```ts
 * [3, NaN, 1].sort(number); // [NaN, 1, 3]
 * ```
 */
export function number(a: number, b: number) {
	const isANaN = Number.isNaN(a);
	const isBNaN = Number.isNaN(b);

	if (isANaN && isBNaN) return 0;
	if (isANaN) return -1;
	if (isBNaN) return 1;

	return a - b;
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
 * Date comparator that falls back to placing invalid dates first.
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
	if (isANaN) return -1;
	if (isBNaN) return 1;

	return aTime - bTime;
}

/**
 * Builds a comparator by projecting values through `key` before comparing.
 *
 * @example
 * ```ts
 * const byAge = by((user: { age: number }) => user.age);
 * users.sort(byAge);
 * ```
 */
export function by<T, K>(
	key: (v: T) => K,
	options?: KeyOptions<K, T>,
): Comparator<T> {
	const compareFn = options?.compare ?? compare;
	const direction = options?.direction ?? 'asc';
	const predicate = options?.predicate;
	const compareFnWithDirection =
		direction === 'asc' ? compareFn : reverse(compareFn);
	if (!predicate) {
		return (a, b) => compareFnWithDirection(key(a), key(b));
	}

	return (a, b) => {
		if (!predicate(a) || !predicate(b)) return 0;
		return compareFnWithDirection(key(a), key(b));
	};
}

/**
 * Chains comparators, returning the first non-zero comparison result.
 *
 * @example
 * ```ts
 * const sortUsers = order(
 *   by((u: { last: string }) => u.last),
 *   by((u) => u.first),
 * );
 * users.sort(sortUsers);
 * ```
 */
export function order<T>(...comparators: Comparator<T>[]): Comparator<T> {
	return (a, b) => {
		for (let i = 0; i < comparators.length; i++) {
			const r = comparators[i]!(a, b);
			if (r !== 0) return r;
		}

		return 0;
	};
}

/**
 * Adapts a comparator to work on mapped values.
 *
 * @example
 * ```ts
 * const sortLengths = map((value: string) => value.length);
 * ['aa', 'b'].sort(sortLengths); // ['b', 'aa']
 * ```
 */
export function map<T, U>(
	map: (value: T) => U,
	compareFn: Comparator<U> = compare,
): Comparator<T> {
	return (a, b) => compareFn(map(a), map(b));
}

/**
 * Runs a comparator only when both values satisfy a predicate.
 *
 * @example
 * ```ts
 * const adultsFirst = when(
 *   (person: { age: number }) => person.age >= 18,
 *   reverse(compare),
 * );
 * people.sort(adultsFirst);
 * ```
 */
export function when<T>(
	predicate: (v: T) => boolean,
	compareFn: Comparator<T>,
): Comparator<T> {
	return (a, b) => {
		const aMatch = predicate(a);
		const bMatch = predicate(b);
		if (aMatch && bMatch) return compareFn(a, b);
		return 0;
	};
}
