import { afterEach, describe, expect, it, vi } from 'vitest';

type Row = { id: number; group: string; score: number | null };
const rows: Row[] = [
	{ id: 1, group: 'b', score: 2 },
	{ id: 2, group: 'a', score: null },
	{ id: 3, group: 'b', score: 1 },
	{ id: 4, group: 'a', score: 2 },
	{ id: 5, group: 'b', score: 2 },
];
const ids = (input: readonly Row[]) => input.map((row) => row.id);

// Fresh modules for each test, so one test's patch or blocked `new Function`
// does not carry over.
async function load() {
	vi.resetModules();
	const { Order } = await import('./order.js');
	const build = () =>
		new Order<Row>()
			.when((row) => row.group === 'a', Order.by((row) => row.id, { direction: 'desc' }))
			.by((row) => row.score, { direction: 'desc', nulls: 'first' })
			.by((row) => row.id);
	// The result of a plain order, taken before the patch.
	const plain = build();
	const expected = { sort: ids(plain.sort(rows)), compare: ids(rows.slice().sort(plain.compare)) };
	return { Order, build, expected };
}

async function patch() {
	await import('./compile.js');
}

function blockNewFunction(): { attempts: number } {
	const counter = { attempts: 0 };
	vi.stubGlobal('Function', class {
		constructor() {
			counter.attempts++;
			throw new EvalError('Code generation from strings disallowed');
		}
	});
	return counter;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('ts-order/compile', () => {
	it('gives the same results as a plain order', async () => {
		const { build, expected } = await load();
		await patch();
		const order = build();
		expect(ids(order.sort(rows))).toEqual(expected.sort);
		expect(ids(rows.slice().sort(order.compare))).toEqual(expected.compare);
		expect(expected.sort).toEqual([4, 2, 1, 5, 3]);
	});

	it('generates code on first use only, once for each of compare and sort', async () => {
		const { build } = await load();
		await patch();
		const generate = vi.spyOn(globalThis, 'Function');
		const order = build();
		expect(generate).not.toHaveBeenCalled();
		order.sort(rows);
		order.sort(rows);
		expect(generate).toHaveBeenCalledTimes(1);
		expect(order.compare).toBe(order.compare);
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it('covers orders created before the import', async () => {
		const { build, expected } = await load();
		const order = build();
		await patch();
		const generate = vi.spyOn(globalThis, 'Function');
		expect(ids(order.sort(rows))).toEqual(expected.sort);
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it('uses the original compare and sort when new Function is blocked', async () => {
		const { build, expected } = await load();
		await patch();
		const blocked = blockNewFunction();
		const order = build();
		expect(ids(order.sort(rows))).toEqual(expected.sort);
		expect(ids(rows.slice().sort(order.compare))).toEqual(expected.compare);
		expect(ids(build().sort(rows))).toEqual(expected.sort);
		// After the first EvalError, nothing tries again.
		expect(blocked.attempts).toBe(1);
	});

	it.each([
		['allowed', false],
		['blocked', true],
	])('works together with compile() when new Function is %s', async (_, block) => {
		const { build, expected } = await load();
		await patch();
		const { compile } = await import('./compiled-order.js');
		if (block) blockNewFunction();
		const compiled = compile(build());
		expect(ids(compiled.sort(rows))).toEqual(expected.sort);
		expect(ids(rows.slice().sort(compiled.compare))).toEqual(expected.compare);
	});
});
