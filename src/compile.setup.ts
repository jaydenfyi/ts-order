// Setup for `bun run test:compile`: the whole suite again, with every Order
// compiled by `ts-order/compile`.
import { vi } from 'vitest';
import { Order } from './order.js';
import './compile.js';

// Fail at once if the patch did not apply, so this run never tests plain orders.
const generate = vi.spyOn(globalThis, 'Function');
Order.by((value: number) => value).sort([2, 1]);
if (generate.mock.calls.length !== 1)
	throw new Error('ts-order/compile did not patch Order');
generate.mockRestore();
