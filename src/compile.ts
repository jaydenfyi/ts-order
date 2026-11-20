// Side-effect-only entry: `import 'ts-order/compile'` makes every `Order`
// generate code for its `compare` and `sort` on first use, as `compile()`
// does for one order. It is listed in `sideEffects` in package.json, so
// bundlers keep it, and apps that never import it do not get the compiler.
//
// It replaces `compare` and `sort` on `Order.prototype`, so it also covers
// orders created before the import. When `new Function` is blocked, it calls
// the original `compare` and `sort`, saved below. It never calls `compile()`
// or a subclass, so `compile()` and this import can be used together.
import type { Comparator } from './types.js';
import { generateCompare, generateSort } from './generate.js';
import { Order } from './order.js';

type Sort = (array: readonly unknown[]) => unknown[];

const proto = Order.prototype;
const plainCompare: (this: Order<unknown>) => Comparator<unknown>
	= Object.getOwnPropertyDescriptor(proto, 'compare')!.get!;
const plainSort = proto.sort;
const compares = new WeakMap<Order<unknown>, Comparator<unknown>>();
const sorts = new WeakMap<Order<unknown>, Sort>();

Object.defineProperty(proto, 'compare', {
	configurable: true,
	get(this: Order<unknown>): Comparator<unknown> {
		let compare = compares.get(this);
		if (!compare) {
			// eslint-disable-next-line dot-notation -- the steps are private to Order
			compare = generateCompare(this['_steps']) ?? plainCompare.call(this);
			compares.set(this, compare);
		}
		return compare;
	},
});

proto.sort = function sort<U>(this: Order<unknown>, array: readonly U[]): U[] {
	let compiled = sorts.get(this);
	if (!compiled) {
		compiled
			// eslint-disable-next-line dot-notation -- the steps are private to Order
			= generateSort(this['_steps'])
				?? ((input: readonly unknown[]) => plainSort.call(this, input));
		sorts.set(this, compiled);
	}
	return compiled(array) as U[];
};
