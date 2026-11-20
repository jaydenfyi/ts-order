import { afterEach, describe, expect, it, vi } from 'vitest';
import { Order } from './order.js';

type Row = { id: number; score: number | null };
const rows: Row[] = [
	{ id: 1, score: 2 },
	{ id: 2, score: null },
	{ id: 3, score: 1 },
	{ id: 4, score: 2 },
];
const byScoreThenId = Order.by((r: Row) => r.score, { direction: 'desc' }).by(
	(r) => r.id,
);
const expected = [1, 4, 3, 2];

// Each test imports a fresh module, so that one test's blocked `new Function`
// does not carry over.
async function importCompile() {
	vi.resetModules();
	return (await import('./compiled-order.js')).compile;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('compile', () => {
	it('sorts with compare and sort', async () => {
		const compile = await importCompile();
		const compiled = compile(byScoreThenId);

		expect(
			rows
				.slice()
				.sort(compiled.compare)
				.map((r) => r.id),
		).toEqual(expected);
		expect(compiled.sort(rows).map((r) => r.id)).toEqual(expected);
		expect(Order.sort(rows, compiled).map((r) => r.id)).toEqual(expected);
	});

	it('returns the same compare function each time', async () => {
		const compile = await importCompile();
		const compiled = compile(byScoreThenId);
		expect(compiled.compare).toBe(compiled.compare);
	});

	it('generates compare and sort eagerly and reuses them', async () => {
		const compile = await importCompile();
		const generate = vi.spyOn(globalThis, 'Function');
		const compiled = compile(byScoreThenId);
		expect(generate).toHaveBeenCalledTimes(2);
		compiled.sort(rows);
		compiled.sort(rows);
		expect(generate).toHaveBeenCalledTimes(2);
		rows.slice().sort(compiled.compare);
		rows.slice().sort(compiled.compare);
		expect(generate).toHaveBeenCalledTimes(2);
		generate.mockRestore();
	});

	it('does not invoke selectors, predicates or comparators during compilation', async () => {
		const compile = await importCompile();
		const key = vi.fn((r: Row) => r.id);
		const predicate = vi.fn((r: Row) => r.score !== null);
		const compare = vi.fn((a: number, b: number) => a - b);
		const order = new Order<Row>().when(
			predicate,
			Order.by(key, { compare }),
		);
		compile(order);
		expect(key).not.toHaveBeenCalled();
		expect(predicate).not.toHaveBeenCalled();
		expect(compare).not.toHaveBeenCalled();
	});

	it('calls a when() predicate once per item in sort', async () => {
		const compile = await importCompile();
		const hasScore = vi.fn((r: Row) => r.score !== null);
		const order = new Order<Row>()
			.when(
				hasScore,
				Order.by((r: Row) => r.score).by((r) => -r.id),
			)
			.by((r) => r.id);
		const plain = order.sort(rows);
		hasScore.mockClear();

		expect(compile(order).sort(rows)).toEqual(plain);
		expect(hasScore).toHaveBeenCalledTimes(rows.length);
	});

	it('sorts an order with 60,000 steps', async () => {
		const compile = await importCompile();
		const many = new Order(
			Array.from({ length: 30_000 }, () => byScoreThenId),
		);
		expect(
			compile(many)
				.sort(rows)
				.map((r) => r.id),
		).toEqual(expected);
	});

	it('uses the normal compare and sort for an order too large to generate', async () => {
		const compile = await importCompile();
		let attempts = 0;
		vi.stubGlobal(
			'Function',
			class {
				constructor() {
					attempts++;
					throw new RangeError('Maximum call stack size exceeded');
				}
			},
		);
		const compiled = compile(byScoreThenId);
		expect(compiled.sort(rows).map((r) => r.id)).toEqual(expected);
		expect(
			rows
				.slice()
				.sort(compiled.compare)
				.map((r) => r.id),
		).toEqual(expected);
		// Only that order falls back. The next order tries again.
		compile(byScoreThenId).sort(rows);
		expect(attempts).toBe(4);
	});

	it('does not change the input array', async () => {
		const compile = await importCompile();
		const input = rows.slice();
		compile(byScoreThenId).sort(input);
		expect(input).toEqual(rows);
	});

	it('keeps the steps, so chaining appends to them', async () => {
		const compile = await importCompile();
		const chained = compile(Order.by((r: Row) => r.score)).by((r) => r.id, {
			direction: 'desc',
		});
		expect(chained.sort(rows).map((r) => r.id)).toEqual([3, 4, 1, 2]);
	});

	it('uses the normal compare and sort when new Function is blocked', async () => {
		const compile = await importCompile();
		let attempts = 0;
		vi.stubGlobal(
			'Function',
			class {
				constructor() {
					attempts++;
					throw new EvalError(
						'Code generation from strings disallowed',
					);
				}
			},
		);
		const first = compile(byScoreThenId);
		const second = compile(byScoreThenId);

		expect(
			rows
				.slice()
				.sort(first.compare)
				.map((r) => r.id),
		).toEqual(expected);
		expect(first.sort(rows).map((r) => r.id)).toEqual(expected);
		expect(second.sort(rows).map((r) => r.id)).toEqual(expected);
		// After the first EvalError, compile() stops trying.
		expect(attempts).toBe(1);
	});

	it('rethrows unexpected errors during compile()', async () => {
		const compile = await importCompile();
		vi.stubGlobal(
			'Function',
			class {
				constructor() {
					throw new SyntaxError('unexpected');
				}
			},
		);
		expect(() => compile(byScoreThenId)).toThrow(SyntaxError);
	});
});
