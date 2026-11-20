import type { Purchase, Sorter } from '../cases.js';
import { compile, Order } from 'ts-order';
import { computedTotal } from '../cases.js';

export function total(): Sorter {
	const byTotal = compile(
		new Order<Purchase>().by((purchase) => purchase.totalCents),
	);
	byTotal.sort([]); // generates the sort code once, before timing
	return (purchases) => byTotal.sort(purchases);
}

export function fulfillment(): Sorter {
	const queue = compile(
		new Order<Purchase>()
			.by((purchase) => purchase.status)
			.by((purchase) => purchase.createdAt, { direction: 'desc' })
			.by((purchase) => purchase.customer.lastName),
	);
	queue.sort([]); // generates the sort code once, before timing
	return (purchases) => queue.sort(purchases);
}

export function computed(): Sorter {
	const byComputedTotal = compile(
		new Order<Purchase>().by(computedTotal, { direction: 'desc' }),
	);
	byComputedTotal.sort([]); // generates the sort code once, before timing
	return (purchases) => byComputedTotal.sort(purchases);
}
