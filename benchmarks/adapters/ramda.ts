import type { Purchase, Sorter } from '../cases.js';
import { ascend, descend, sortWith } from 'ramda';
import { computedTotal } from '../cases.js';

export function total(): Sorter {
	return sortWith<Purchase>([ascend((purchase) => purchase.totalCents)]);
}

export function fulfillment(): Sorter {
	return sortWith<Purchase>([
		ascend((purchase) => purchase.status),
		descend((purchase) => purchase.createdAt),
		ascend((purchase) => purchase.customer.lastName),
	]);
}

export function computed(): Sorter {
	return sortWith<Purchase>([descend(computedTotal)]);
}
