import { describe, expectTypeOf, it } from 'vitest';
import { Order } from './order.js';

type Shape = { area: number };
type Triangle = Shape & { base: number; height: number };

describe('Order.sort types', () => {
	it('keeps the element type of the input when the order is for a wider type', () => {
		const order = Order.by((shape: Shape) => shape.area);
		const triangles: Triangle[] = [];

		expectTypeOf(order.sort(triangles)).toEqualTypeOf<Triangle[]>();
		expectTypeOf(Order.sort(triangles, order)).toEqualTypeOf<Triangle[]>();
	});
});
