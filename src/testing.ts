/** Every ordering of `items`. Keep inputs small: n items give n! orderings. */
export function permutations<T>(items: readonly T[]): T[][] {
	if (items.length <= 1) return [items.slice()];
	return items.flatMap((item, i) =>
		permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [
			item,
			...rest,
		]),
	);
}

/** The distinct results of sorting every ordering of `items`. A consistent sort gives exactly one. */
export function distinctSorts<T>(
	items: readonly T[],
	sort: (items: T[]) => unknown,
): Set<string> {
	return new Set(permutations(items).map((p) => JSON.stringify(sort(p))));
}
