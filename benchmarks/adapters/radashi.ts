import type { Purchase, Sorter } from '../cases.js';
import { castComparator, sort } from 'radashi';
import { computedTotal } from '../cases.js';

export function total(): Sorter {
	return (purchases) => sort(purchases, (purchase) => purchase.totalCents);
}

// Radashi's sort takes one numeric key, and Radashi has no way to chain
// comparators, so `||` joins one castComparator per key.
export function fulfillment(): Sorter {
	const byStatus = castComparator((purchase: Purchase) => purchase.status);
	const byNewest = castComparator(
		(purchase: Purchase) => purchase.createdAt,
		null,
		true,
	);
	const bySurname = castComparator(
		(purchase: Purchase) => purchase.customer.lastName,
	);
	return (purchases) =>
		purchases.toSorted(
			(a, b) => byStatus(a, b) || byNewest(a, b) || bySurname(a, b),
		);
}

export function computed(): Sorter {
	return (purchases) => sort(purchases, computedTotal, 'desc');
}
