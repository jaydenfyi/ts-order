export type Direction = 'asc' | 'desc';
export type Comparator<T> = (a: T, b: T) => number;

export function reverse<T>(compareFn: Comparator<T>): Comparator<T> {
	return (a, b) => compareFn(b, a);
}

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

export function compare<T>(a: T, b: T): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

export { compare as string };

export function number(a: number, b: number) {
	const isANaN = Number.isNaN(a);
	const isBNaN = Number.isNaN(b);

	if (isANaN && isBNaN) return 0;
	if (isANaN) return -1;
	if (isBNaN) return 1;

	return a - b;
}

export function boolean(a: boolean, b: boolean) {
	return Number(a) - Number(b);
}

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

type ByOptions<K> = {
	compare?: Comparator<K>;
	direction?: Direction | undefined;
};

export function by<T, K>(key: (v: T) => K, arg?: ByOptions<K>): Comparator<T> {
	const compareFn = arg?.compare ?? compare;
	const direction = arg?.direction ?? 'asc';
	const compareFnWithDirection =
		direction === 'asc' ? compareFn : reverse(compareFn);
	return (a, b) => compareFnWithDirection(key(a), key(b));
}

export function order<T>(...comparators: Comparator<T>[]): Comparator<T> {
	return (a, b) => {
		for (let i = 0; i < comparators.length; i++) {
			const r = comparators[i]!(a, b);
			if (r !== 0) return r;
		}

		return 0;
	};
}

export function map<T, U>(
	map: (value: T) => U,
	compareFn: Comparator<U> = compare,
): Comparator<T> {
	return (a, b) => compareFn(map(a), map(b));
}

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
