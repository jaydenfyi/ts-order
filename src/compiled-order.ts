import type { Comparator } from './types.js';
import { generateCompare, generateSort } from './generate.js';
import { Order } from './order.js';

/**
 * Return an order with the same steps as `order`, whose `compare` and `sort`
 * run code generated for those steps. The code is generated with `new Function`
 * immediately, before this function returns. In the package benchmarks, its
 * `sort` is 1.6 to 2.2 times as fast on 1,000 records, most for orders with
 * several steps.
 *
 * Where `new Function` is blocked, such as under a Content Security Policy
 * without `'unsafe-eval'`, on Cloudflare Workers or on edge runtimes, the
 * returned order uses the normal `compare` and `sort`. Results are the same
 * either way.
 *
 * Steps added to the returned order with `.by()`, `.when()` and the other
 * builder methods make a normal order, so compile an order after you finish
 * building it.
 *
 * @example
 * ```ts
 * import { compile, Order } from 'ts-order';
 *
 * const byStatusThenNewest = compile(
 * 	Order.by((u: User) => u.status)
 * 		.by((u) => u.createdAt, { direction: 'desc' }),
 * );
 *
 * users.sort(byStatusThenNewest.compare);
 * ```
 */
export function compile<T>(order: Order<T>): Order<T> {
	return new CompiledOrder(order);
}

// Bracket access is how a subclass reads the private members of `Order`.
/* eslint-disable dot-notation */
class CompiledOrder<T> extends Order<T> {
	private readonly _sort: (array: readonly T[]) => T[];

	constructor(order: Order<T>) {
		super(order);
		this['_compare'] = generateCompare(this['_steps']) ?? super.compare;
		this._sort =
			generateSort(this['_steps']) ?? ((input) => super.sort(input));
	}

	override get compare(): Comparator<T> {
		return this['_compare']!;
	}

	override sort<U extends T>(array: readonly U[]): U[] {
		return this._sort(array) as U[];
	}
}
