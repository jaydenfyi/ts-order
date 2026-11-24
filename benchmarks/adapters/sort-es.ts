import type { Purchase, Sorter } from '../cases.js';
import { byNumber, byString, byValue, byValues } from 'sort-es';
import { computedTotal } from '../cases.js';

export function total(): Sorter {
	const compare = byValue(
		(purchase: Purchase) => purchase.totalCents,
		byNumber(),
	);
	return (purchases) => purchases.toSorted(compare);
}

export function fulfillment(): Sorter {
	const compare: (a: Purchase, b: Purchase) => number = byValues([
		[(purchase) => purchase.status, byNumber()],
		[(purchase) => purchase.createdAt, byNumber({ desc: true })],
		[(purchase) => purchase.customer.lastName, byString()],
	]);
	return (purchases) => purchases.toSorted(compare);
}

export function computed(): Sorter {
	const compare = byValue(computedTotal, byNumber({ desc: true }));
	return (purchases) => purchases.toSorted(compare);
}
