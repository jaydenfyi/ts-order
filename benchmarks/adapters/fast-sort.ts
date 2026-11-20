import type { Sorter } from '../cases.js';
import { sort } from 'fast-sort';
import { computedTotal } from '../cases.js';

export function total(): Sorter {
	return (purchases) =>
		sort(purchases).asc((purchase) => purchase.totalCents);
}

export function fulfillment(): Sorter {
	return (purchases) =>
		sort(purchases).by([
			{ asc: (purchase) => purchase.status },
			{ desc: (purchase) => purchase.createdAt },
			{ asc: (purchase) => purchase.customer.lastName },
		]);
}

export function computed(): Sorter {
	return (purchases) => sort(purchases).desc(computedTotal);
}
