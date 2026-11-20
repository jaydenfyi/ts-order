import type { Purchase } from './cases.js';
import type { Results, RuntimeRow } from './report.js';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { Bench } from 'tinybench';
import { ADAPTERS, sortersFor } from './adapters.js';
import {
	makePurchases,
	SCENARIOS,
	shapeInput,
	SHAPES,
	shuffle,
	SIZES,
} from './cases.js';
import { publish } from './publish.js';
import { measureSizes, ROOT } from './sizes.js';
import { assertOutput, validateSort } from './validate.js';

const args = process.argv.slice(2);
assert(
	args.every((arg) => arg === '--full'),
	'Only --full is supported',
);
// Reject fallback timings being mislabeled as compiled results.
try {
	// oxlint-disable-next-line typescript/no-implied-eval -- compiled benchmarks require dynamic code generation
	new Function('')();
} catch (error) {
	throw new Error(
		'Compiled benchmarks require Node with dynamic code generation enabled',
		{ cause: error },
	);
}
const quick = !args.includes('--full');
const settings: Results['settings'] = {
	quick,
	sizes: SIZES,
	shapes: quick ? ['shuffled'] : SHAPES,
	rounds: quick ? 2 : 3,
	timeMs: quick ? 50 : 200,
	warmupMs: quick ? 20 : 100,
	minimumSamples: quick ? 3 : 10,
	seed: 20261119,
};
const versions: Record<string, string> = {};
for (const name of new Set([
	'ts-order',
	...ADAPTERS.flatMap((adapter) =>
		adapter.package ? [adapter.package] : [],
	),
	'tinybench',
	'esbuild',
	'tsx',
])) {
	const path =
		name === 'ts-order'
			? resolve(ROOT, 'package.json')
			: resolve(ROOT, 'node_modules', name, 'package.json');
	versions[name] = (
		JSON.parse(readFileSync(path, 'utf8')) as { version: string }
	).version;
}
const sourceFiles = [
	'package.json',
	'bun.lock',
	...['src', 'benchmarks'].flatMap((directory) =>
		readdirSync(resolve(ROOT, directory), {
			recursive: true,
			encoding: 'utf8',
		})
			.filter((name) => name.endsWith('.ts'))
			.map((name) => `${directory}/${name}`),
	),
].sort();
const hash = createHash('sha256');
for (const name of sourceFiles)
	hash.update(name)
		.update('\0')
		.update(readFileSync(resolve(ROOT, name)))
		.update('\0');
const results: Results = {
	metadata: {
		date: new Date().toISOString(),
		node: process.version,
		v8: process.versions.v8,
		platform: `${platform()} ${release()} ${arch()}`,
		cpu: cpus()[0]?.model ?? 'unknown',
		memoryGiB: Math.round(totalmem() / 1024 ** 3),
		commit: execFileSync('git', ['rev-parse', 'HEAD'], {
			cwd: ROOT,
			encoding: 'utf8',
		}).trim(),
		dirty:
			execFileSync('git', ['status', '--porcelain'], {
				cwd: ROOT,
				encoding: 'utf8',
			}).trim().length > 0,
		sourceHash: hash.digest('hex'),
		versions,
	},
	settings,
	runtime: [],
	bundles: [],
};

for (let round = 0; round < settings.rounds; round++) {
	for (const size of settings.sizes) {
		const purchases = makePurchases(size, settings.seed + round);
		for (const scenario of SCENARIOS) {
			for (const shape of settings.shapes) {
				const input = shapeInput(purchases, scenario, shape);
				const original = [...input];
				const expected = input.slice().sort(scenario.reference);
				const variants = shuffle(
					sortersFor(scenario),
					settings.seed +
						round * 1_009 +
						size +
						results.runtime.length,
				);
				console.log(
					`Round ${round + 1}/${settings.rounds}: ${scenario.id}, ${shape}, ${size.toLocaleString('en-US')} orders`,
				);
				const bench = new Bench({
					time: settings.timeMs,
					warmupTime: settings.warmupMs,
					iterations: settings.minimumSamples,
					warmupIterations: 3,
					throws: true,
				});
				for (const variant of variants) {
					validateSort(variant.sort, input, expected, variant.label);
					let output: Purchase[] = [];
					bench.add(
						variant.id,
						() => {
							output = variant.sort(input);
						},
						{
							async: false,
							afterAll: () => {
								assertOutput(output, expected, variant.label);
								assertOutput(
									input,
									original,
									`${variant.label}: mutated input`,
								);
							},
						},
					);
				}
				bench.runSync();
				for (const task of bench.tasks) {
					const measured = task.result;
					assert.equal(
						measured.state,
						'completed',
						`${task.name}: measurement did not complete`,
					);
					if (measured.state !== 'completed')
						throw new Error('Incomplete benchmark');
					const row: RuntimeRow = {
						round,
						size,
						scenario: scenario.id,
						shape,
						implementation: task.name,
						meanMs: measured.latency.mean,
						medianMs: measured.latency.p50,
						p99Ms: measured.latency.p99,
						rmePercent: measured.latency.rme,
						samples: measured.latency.samplesCount,
					};
					assert(
						Object.values(row).every(
							(value) =>
								typeof value !== 'number' ||
								Number.isFinite(value),
						),
						'Non-finite measurement',
					);
					results.runtime.push(row);
				}
			}
		}
	}
}
console.log('Measuring and validating browser bundle sizes…');
results.bundles = await measureSizes();
const jsonPath = resolve(
	ROOT,
	quick ? 'benchmarks/results.json' : 'benchmarks/full.json',
);
// Publish only after every implementation, measurement and emitted bundle has passed validation.
writeFileSync(jsonPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Saved ${jsonPath}, ${publish(results).join(', ')}`);
