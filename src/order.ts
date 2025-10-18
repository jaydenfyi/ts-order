/* eslint-disable unicorn/no-new-array */

export type Direction = 'asc' | 'desc';
/** Direction sign for the given order step. 1 for "asc", -1 for "desc" */
type DirectionSign = 1 | -1;

export type KeyOptions<K> = {
	/**
	 * Direction for this step. Default "asc".
	 * Semantics: "asc" → cmp(a,b); "desc" → cmp(b,a).
	 */
	direction?: Direction;

	/**
	 * Comparator for this key's values.
	 * If omitted, engines use the spec-native default (ARC; see §4.2).
	 */
	compare?: (a: K, b: K) => number;
};

type OrderStep<T> = {
	key: (t: T) => unknown;
	direction: DirectionSign; // 1 for asc, -1 for desc
	compare?: ((a: unknown, b: unknown) => number) | undefined; // optional per-step comparator
};

const directionSignByDirection = {
	asc: 1,
	desc: -1,
} as const satisfies Record<Direction, DirectionSign>;

export class Order<T> {
	private _steps: OrderStep<T>[] = [];

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
		if (
			!sourceOrSources ||
			(sourceOrSources as Order<T>)._steps.length === 0
		) {
			return;
		}

		for (let i = 0; i < (sourceOrSources as Order<T>)._steps.length; i++) {
			this._steps.push((sourceOrSources as Order<T>)._steps[i]!);
		}
	}

	static by<T, K>(
		selectorFn: (item: T) => K,
		options?: { direction?: Direction; compare?: (a: K, b: K) => number },
	): Order<T> {
		const order = new Order<T>();
		const direction = directionSignByDirection[options?.direction ?? 'asc'];
		const compare = options?.compare as (a: unknown, b: unknown) => number;
		order._assignSteps([
			{ key: selectorFn as (t: T) => unknown, direction, compare },
		]);

		return order;
	}

	by<K>(
		selectorFn: (item: T) => K,
		options?: { direction?: Direction; compare?: (a: K, b: K) => number },
	): Order<T> {
		const nextOrder = new Order<T>();
		const direction = directionSignByDirection[options?.direction ?? 'asc'];
		const compare = options?.compare as (a: unknown, b: unknown) => number;
		nextOrder._assignSteps([
			...this._steps,
			{ key: selectorFn, direction, compare },
		]);

		return nextOrder;
	}

	static reverse<T>(input: Order<T>): Order<T> {
		if (input._steps.length === 0) return new Order<T>();
		const reversedOrder = new Order<T>();
		reversedOrder._assignSteps(
			input._steps.map((s) => ({
				key: s.key,
				direction: s.direction === 1 ? -1 : 1,
				compare: s.compare,
			})),
		);

		return reversedOrder;
	}

	reverse(): Order<T> {
		return Order.reverse(this);
	}

	static map<T, K>(outer: (t: T) => K, sub: Order<K>): Order<T> {
		if (sub._steps.length === 0) return new Order<T>();
		const mappedOrder = new Order<T>();
		mappedOrder._assignSteps(
			sub._steps.map<OrderStep<T>>((s) => ({
				key: (t: T) => s.key(outer(t)),
				direction: s.direction,
				compare: s.compare,
			})),
		);

		return mappedOrder;
	}

	map<K>(outer: (t: T) => K, sub: Order<K>): Order<T> {
		if (this._steps.length === 0) return Order.map(outer, sub);
		const mappedOrder = Order.map(outer, sub);
		const nextOrder = new Order<T>();
		nextOrder._assignSteps([...this._steps, ...mappedOrder._steps]);

		return nextOrder;
	}

	get compare(): (a: T, b: T) => number {
		const steps = this._steps;
		const numberOfSteps = steps.length;
		if (numberOfSteps === 0) return () => 0;

		// @codegen inlineCompareSteps(16)

		return (a: T, b: T): number => {
			for (let i = 0; i < numberOfSteps; i++) {
				const s = steps[i]!;
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

	static sort<T>(array: readonly T[], order: Order<T>): T[] {
		const steps = order._steps;
		const arrayLength = array.length;

		if (arrayLength <= 1) return array.slice();
		if (steps.length === 0) return array.slice();

		const numberOfSteps = steps.length;

		// ---------- Always DSU: precompute keys for every step ----------
		const keysPerStep: unknown[][] = new Array(numberOfSteps);
		for (let j = 0; j < numberOfSteps; j++)
			keysPerStep[j] = new Array(arrayLength);

		for (let i = 0; i < arrayLength; i++) {
			for (let j = 0; j < numberOfSteps; j++) {
				keysPerStep[j]![i] = steps[j]!.key(array[i]!);
			}
		}

		const arrayIndexes: number[] = new Array(arrayLength);
		for (let i = 0; i < arrayLength; i++) arrayIndexes[i] = i;

		// ---------- Unified comparator-aware DSU comparator (explicit ifs for 1..5) ----------
		const dirs = new Int8Array(numberOfSteps);
		const cmps = new Array<
			((a: unknown, b: unknown) => number) | undefined
		>(numberOfSteps);
		for (let j = 0; j < numberOfSteps; j++) {
			dirs[j] = steps[j]!.direction;
			cmps[j] = steps[j]!.compare;
		}

		// @codegen inlineSortSteps(16)

		arrayIndexes.sort((ia, ib) => {
			for (let j = 0; j < numberOfSteps; j++) {
				const kj = keysPerStep[j]!;
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

	sort(array: readonly T[]): T[] {
		return Order.sort(array, this);
	}

	private _assignSteps(steps: OrderStep<T>[]): void {
		this._steps = steps;
	}
}
