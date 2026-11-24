import type { Purchase, Sorter } from '../cases.js';
import { ascend, descend, sortBy, sortByDescending, sortWith } from 'rambda';
import { computedTotal } from '../cases.js';

// Rambda types its list as mutable, but these functions sort with `toSorted`.

export function total(): Sorter {
	const sort = sortBy((purchase: Purchase) => purchase.totalCents);
	return (purchases) => sort(purchases as Purchase[]);
}

export function fulfillment(): Sorter {
	const sort = sortWith<Purchase>([
		ascend((purchase) => purchase.status),
		descend((purchase) => purchase.createdAt),
		ascend((purchase) => purchase.customer.lastName),
	]);
	return (purchases) => sort(purchases as Purchase[]);
}

export function computed(): Sorter {
	const sort = sortByDescending(computedTotal);
	return (purchases) => sort(purchases as Purchase[]);
}
