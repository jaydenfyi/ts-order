import type { Purchase, Sorter } from '../cases.js';
import * as EffectArray from 'effect/Array';
import * as Order from 'effect/Order';
import { computedTotal } from '../cases.js';

// Array.sortWith caches one key; a multi-key queue has no cached form.

export function total(): Sorter {
	return EffectArray.sortWith<readonly Purchase[], number>(
		(purchase) => purchase.totalCents,
		Order.Number,
	);
}

export function computed(): Sorter {
	return EffectArray.sortWith<readonly Purchase[], number>(
		computedTotal,
		Order.flip(Order.Number),
	);
}
