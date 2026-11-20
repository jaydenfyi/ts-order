import type { ComplexScenario, Shipment } from './complex.js';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { Bench } from 'tinybench';
import { shuffle, SIZES } from './cases.js';
import {
	COMPLEX_IMPLEMENTATIONS,
	COMPLEX_SCENARIOS,
	makeShipments,
	region,
} from './complex.js';
import { formatNumber, median, timeUnit } from './report.js';
import { ROOT } from './sizes.js';
import { assertOutput, validateSort } from './validate.js';

type Row = {
	round: number;
	size: number;
	scenario: string;
	implementation: string;
	meanMs: number;
};

const ROUNDS = 2;
const SEED = 20261120;
const rows: Row[] = [];

for (let round = 0; round < ROUNDS; round++) {
	for (const size of SIZES) {
		const input = makeShipments(size, SEED + round);
		for (const scenario of COMPLEX_SCENARIOS) {
			console.log(
				`Round ${round + 1}/${ROUNDS}: ${scenario.id}, ${size.toLocaleString('en-US')} shipments`,
			);
			const expected = input.slice().sort(scenario.reference);
			const bench = new Bench({
				time: 50,
				warmupTime: 20,
				iterations: 3,
				warmupIterations: 3,
				throws: true,
			});
			for (const { id } of shuffle(
				COMPLEX_IMPLEMENTATIONS,
				SEED + round * 1_009 + size,
			)) {
				const sort = scenario.sorters[id];
				validateSort(sort, input, expected, id);
				let output: Shipment[] = [];
				bench.add(
					id,
					() => {
						output = sort(input);
					},
					{ afterAll: () => assertOutput(output, expected, id) },
				);
			}
			bench.runSync();
			for (const task of bench.tasks) {
				assert.equal(task.result.state, 'completed', task.name);
				if (task.result.state !== 'completed')
					throw new Error(task.name);
				rows.push({
					round,
					size,
					scenario: scenario.id,
					implementation: task.name,
					meanMs: task.result.latency.mean,
				});
			}
		}
	}
}

const source = readFileSync(resolve(ROOT, 'benchmarks/complex.ts'), 'utf8');
const loc = (text: string) =>
	text
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('//')).length;

function table(scenario: ComplexScenario): string[] {
	const center = (id: string, size: number) =>
		median(
			rows
				.filter(
					(row) =>
						row.scenario === scenario.id &&
						row.implementation === id &&
						row.size === size,
				)
				.map((row) => row.meanMs),
		);
	const lines = [
		`| Implementation | ${SIZES.map((size) => `${size.toLocaleString('en-US')} (${timeUnit(center('native', size))})`).join(' | ')} |`,
		`| --- | ${SIZES.map(() => '---:').join(' | ')} |`,
	];
	const largest = SIZES.at(-1)!;
	const ranked = [...COMPLEX_IMPLEMENTATIONS].sort(
		(a, b) => center(a.id, largest) - center(b.id, largest),
	);
	for (const { id, label } of ranked) {
		const cells = SIZES.map((size) => {
			const ms = center(id, size);
			const native = center('native', size);
			const value = timeUnit(native) === 'µs' ? ms * 1_000 : ms;
			return `${formatNumber(value)} · ${(ms / native).toFixed(2)}×`;
		});
		lines.push(`| ${label} | ${cells.join(' | ')} |`);
	}
	return lines;
}

const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
	cwd: ROOT,
	encoding: 'utf8',
}).trim();
const shared = region(source, 'shared');
const lines = [
	'# Complex ordering benchmarks',
	'',
	'[Simple-key benchmarks](../BENCHMARKS.md) compare ts-order with other libraries on one to three plain keys. This page covers what those leave out: conditional rules, custom ranks, missing values, locale collation, reusable nested orders and a computed key. Only native comparators and ts-order are compared. Other libraries express these rules differently or not at all, so a like-for-like row would mostly measure custom glue code.',
	'',
	`Shuffled input · ${ROUNDS} rounds · median of round means · ${SIZES.map((size) => size.toLocaleString('en-US')).join(', ')} shipments. **1.00× = the handwritten native comparator** in that column; lower is faster. Every implementation returns the same array, including the order of tied items, checked before and after timing.`,
	'',
	'Line counts skip blank lines and comments. Both workloads share these helpers, which are not counted:',
	'',
	'```ts',
	shared,
	'```',
	'',
	'They also share a customer ordering: tier rank, then locale-aware surname and first name.',
	'',
	'| ts-order | Native |',
	'| --- | --- |',
	`| ${loc(region(source, 'customer-ts-order'))} lines | ${loc(region(source, 'customer-native'))} lines |`,
	'',
	'```ts',
	region(source, 'customer-ts-order'),
	'```',
	'',
	'```ts',
	region(source, 'customer-native'),
	'```',
	'',
];
for (const scenario of COMPLEX_SCENARIOS) {
	const ours = region(source, `${scenario.id}-ts-order`);
	const native = region(source, `${scenario.id}-native`);
	const cached = region(source, `${scenario.id}-native-cached`);
	lines.push(
		`## ${scenario.title}`,
		'',
		scenario.description,
		'',
		...table(scenario),
		'',
		`### ts-order (${loc(ours)} lines)`,
		'',
		'The same order runs as `order.sort(items)`, `items.toSorted(order.compare)` or `compile(order).sort(items)`.',
		'',
		'```ts',
		ours,
		'```',
		'',
		`### Native comparator (${loc(native)} lines)`,
		'',
		'```ts',
		native,
		'```',
		'',
		`<details><summary>Native with cached keys (${loc(cached)} lines)</summary>`,
		'',
		'This version computes each key once per item, like `order.sort()` does. The comparator logic is repeated against the cached fields.',
		'',
		'```ts',
		cached,
		'```',
		'',
		'</details>',
		'',
	);
}
lines.push(
	'## Environment',
	'',
	`Measured ${new Date().toISOString()} on Node ${process.version} (V8 ${process.versions.v8}), ${platform()} ${release()} ${arch()}, ${cpus()[0]?.model ?? 'unknown CPU'}. Commit \`${commit}\` with local changes. Tinybench: at least 50 ms and 3 samples per cell after a 20 ms warm-up. One machine and one runtime; repeat on your target before relying on small differences.`,
	'',
	'Reproduce with `bun run bench:complex`.',
	'',
);
writeFileSync(
	resolve(ROOT, 'benchmarks/complex.json'),
	`${JSON.stringify(rows, null, 2)}\n`,
);
writeFileSync(resolve(ROOT, 'benchmarks/complex.md'), lines.join('\n'));
console.log('Saved benchmarks/complex.md and benchmarks/complex.json');
