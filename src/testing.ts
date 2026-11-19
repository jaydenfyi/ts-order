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

/** A seeded random number generator, so that randomized tests repeat exactly. */
export function seededRandom(seed: number): () => number {
	let x = seed >>> 0 || 1;
	return () => {
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		return (x >>> 0) / 4294967296;
	};
}

/** A shuffled copy of `items` (Fisher-Yates). */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
	const out = items.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}
