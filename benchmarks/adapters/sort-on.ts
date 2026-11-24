import type { Purchase, Sorter } from '../cases.js';
import sortOn from 'sort-on';
import { computedTotal } from '../cases.js';

export function total(): Sorter {
	return (purchases) => sortOn(purchases, 'totalCents');
}

export function fulfillment(): Sorter {
	// Only string paths take the `-` descending prefix, so every key is a path.
	return (purchases) =>
		sortOn(purchases, ['status', '-createdAt', 'customer.lastName']);
}

export function computed(): Sorter {
	// Function keys cannot be descending; negating the numeric key reverses it.
	return (purchases) =>
		sortOn(purchases, (purchase: Purchase) => -computedTotal(purchase));
}
