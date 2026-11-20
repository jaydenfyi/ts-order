import type { Sorter } from '../cases.js';
import { sort } from 'radashi';
import { computedTotal } from '../cases.js';

// Radashi's sort takes one numeric key, so it has no fulfillment queue.

export function total(): Sorter {
	return (purchases) => sort(purchases, (purchase) => purchase.totalCents);
}

export function computed(): Sorter {
	return (purchases) => sort(purchases, computedTotal, 'desc');
}
