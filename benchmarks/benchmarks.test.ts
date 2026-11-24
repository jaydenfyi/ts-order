import type { Purchase, ScenarioId } from './cases.js';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { ADAPTERS, adaptersFor, sortersFor } from './adapters.js';
import * as compiledCompare from './adapters/ts-order-compiled-compare.js';
import * as compiledSort from './adapters/ts-order-compiled.js';
import {
	computedTotal,
	makePurchases,
	SCENARIOS,
	shapeInput,
	SHAPES,
} from './cases.js';
import { median } from './report.js';
import { measureSizes } from './sizes.js';
import { validateSort } from './validate.js';

const CACHED = new Set([
	'native-cached',
	'ts-order-class',
	'ts-order-compiled',
	'lodash',
	'es-toolkit-compat',
	'effect-cached',
	'natural-orderby',
]);

/** Copies of `input` whose top-level fields count their reads. */
function counted(input: readonly Purchase[]): {
	records: Purchase[];
	reads: Partial<Record<keyof Purchase, number>>;
} {
	const reads: Partial<Record<keyof Purchase, number>> = {};
	const records = input.map((purchase) => {
		const record = {} as Purchase;
		for (const [field, value] of Object.entries(purchase) as [
			keyof Purchase,
			unknown,
		][]) {
			Object.defineProperty(record, field, {
				enumerable: true,
				get: () => {
					reads[field] = (reads[field] ?? 0) + 1;
					return value;
				},
			});
		}
		return record;
	});
	return { records, reads };
}

function freeze(input: Purchase[]): readonly Purchase[] {
	for (const purchase of input) {
		for (const line of purchase.lines) Object.freeze(line);
		Object.freeze(purchase.lines);
		Object.freeze(purchase.customer);
		Object.freeze(purchase);
	}
	return Object.freeze(input);
}

const fixtures: Purchase[] = [
	{
		id: 1,
		totalCents: 100,
		status: 1,
		createdAt: 100,
		customer: { lastName: 'Z' },
		lines: [{ priceCents: 101, quantity: 3, discountPercent: 10 }],
	},
	{
		id: 2,
		totalCents: 100,
		status: 0,
		createdAt: 50,
		customer: { lastName: 'B' },
		lines: [{ priceCents: 500, quantity: 2, discountPercent: 0 }],
	},
	{
		id: 3,
		totalCents: -5,
		status: 0,
		createdAt: 100,
		customer: { lastName: 'C' },
		lines: [{ priceCents: 0, quantity: 1, discountPercent: 0 }],
	},
	{
		id: 4,
		totalCents: 0,
		status: 0,
		createdAt: 100,
		customer: { lastName: 'A' },
		lines: [{ priceCents: 99, quantity: 1, discountPercent: 20 }],
	},
];
fixtures.push({ ...fixtures[1]!, id: 5 });
freeze(fixtures);
const expectedIds: Record<string, number[]> = {
	total: [3, 4, 1, 2, 5],
	fulfillment: [4, 3, 2, 5, 1],
	computed: [2, 5, 1, 4, 3],
};

describe('benchmark correctness', () => {
	it('generates deterministic data, finite totals and intentional complete ties', () => {
		const data = makePurchases(100, 42);
		expect(data).toEqual(makePurchases(100, 42));
		expect(data).not.toEqual(makePurchases(100, 43));
		expect(new Set(data.map((purchase) => purchase.id)).size).toBe(100);
		for (const purchase of data)
			expect(purchase.totalCents).toBe(computedTotal(purchase));
		const first = data.find((purchase) => purchase.id === 19)!;
		const duplicate = data.find((purchase) => purchase.id === 20)!;
		for (const scenario of SCENARIOS)
			expect(scenario.reference(first, duplicate)).toBe(0);
	});

	it('rounds discounted lines before summing', () => {
		expect(computedTotal(fixtures[0]!)).toBe(273);
		expect(
			computedTotal({
				...fixtures[0]!,
				lines: [
					{ priceCents: 101, quantity: 1, discountPercent: 50 },
					{ priceCents: 101, quantity: 1, discountPercent: 50 },
				],
			}),
		).toBe(102);
	});

	for (const scenario of SCENARIOS) {
		it(`${scenario.id}: matches hand-calculated results and leaves nested records unchanged`, () => {
			const expected = fixtures.slice().sort(scenario.reference);
			expect(expected.map((purchase) => purchase.id)).toEqual(
				expectedIds[scenario.id],
			);
			for (const { label, sort } of sortersFor(scenario)) {
				validateSort(sort, fixtures, expected, label);
				validateSort(sort, Object.freeze([]), [], label);
				validateSort(
					sort,
					Object.freeze([fixtures[0]!]),
					[fixtures[0]!],
					label,
				);
			}
		});

		for (const shape of SHAPES) {
			it(`${scenario.id}/${shape}: identical output and stable ties for every adapter`, () => {
				const input = freeze(
					shapeInput(makePurchases(1_000), scenario, shape),
				);
				const expected = input.slice().sort(scenario.reference);
				for (const { label, sort } of sortersFor(scenario))
					validateSort(sort, input, expected, label);
			});
		}
	}

	it('measures every library on every workload', () => {
		for (const scenario of SCENARIOS)
			expect(sortersFor(scenario).map((sorter) => sorter.id)).toEqual(
				ADAPTERS.map((adapter) => adapter.id),
			);
	});

	it('cached APIs read every sort field exactly once per record', () => {
		const fields: Record<ScenarioId, (keyof Purchase)[]> = {
			total: ['totalCents'],
			fulfillment: ['status', 'createdAt', 'customer'],
			computed: ['lines'],
		};
		for (const scenario of SCENARIOS) {
			const expected = fixtures.slice().sort(scenario.reference);
			for (const adapter of adaptersFor(scenario).filter((item) =>
				CACHED.has(item.id),
			)) {
				const sort = adapter.factories[scenario.id]!();
				const { records, reads } = counted(fixtures);
				validateSort(
					sort,
					records,
					expected.map((item) => records[fixtures.indexOf(item)]!),
					adapter.label,
				);
				expect(reads, `${adapter.id}/${scenario.id}`).toEqual(
					Object.fromEntries(
						fields[scenario.id].map((field) => [
							field,
							fixtures.length,
						]),
					),
				);
			}
		}
	});

	it('prepares compiled code once before measured sorts, without reading records during setup', () => {
		const scenario = SCENARIOS[0]!;
		const expected = fixtures.slice().sort(scenario.reference);
		for (const factory of [compiledSort.total, compiledCompare.total]) {
			const generate = vi.spyOn(globalThis, 'Function');
			try {
				const { records, reads } = counted(fixtures);
				const sort = factory();
				expect(reads).toEqual({});
				expect(generate).toHaveBeenCalledTimes(2);
				const ordered = expected.map(
					(item) => records[fixtures.indexOf(item)]!,
				);
				validateSort(sort, records, ordered, 'compiled');
				validateSort(sort, records, ordered, 'compiled reused');
				expect(generate).toHaveBeenCalledTimes(2);
			} finally {
				generate.mockRestore();
			}
		}
	});

	it('rejects a code-generation-blocked benchmark instead of timing the normal fallback', () => {
		const result = spawnSync(
			process.execPath,
			[
				'--disallow-code-generation-from-strings',
				'--import',
				'tsx',
				fileURLToPath(new URL('./run.ts', import.meta.url)),
			],
			{ encoding: 'utf8' },
		);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain(
			'Compiled benchmarks require Node with dynamic code generation enabled',
		);
		expect(result.stdout).not.toContain('Round 1/');
	});

	it('computes medians without mutating round measurements', () => {
		const values = [3, 1, 2];
		expect(median(values)).toBe(2);
		expect(median([2, 1])).toBe(1.5);
		expect(values).toEqual([3, 1, 2]);
	});

	it('bundles executable browser examples for every supported workload', async () => {
		const sizes = await measureSizes();
		expect(sizes).toHaveLength(
			SCENARIOS.reduce(
				(count, scenario) => count + sortersFor(scenario).length,
				0,
			),
		);
		for (const size of sizes) {
			expect(size.minified).toBeGreaterThan(0);
			expect(size.gzip).toBeGreaterThan(0);
		}
	}, 60_000);
});
