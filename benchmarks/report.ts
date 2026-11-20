import type { Shape } from './cases.js';
import type { BundleSize } from './sizes.js';
import { ADAPTERS, adaptersFor, sourceFor } from './adapters.js';
import { SCENARIOS } from './cases.js';

export type RuntimeRow = {
	round: number;
	size: number;
	scenario: string;
	shape: Shape;
	implementation: string;
	meanMs: number;
	medianMs: number;
	p99Ms: number;
	rmePercent: number;
	samples: number;
};
export type Results = {
	metadata: {
		date: string;
		node: string;
		v8: string;
		platform: string;
		cpu: string;
		memoryGiB: number;
		commit: string;
		dirty: boolean;
		sourceHash: string;
		versions: Record<string, string>;
	};
	settings: {
		quick: boolean;
		sizes: number[];
		shapes: readonly Shape[];
		rounds: number;
		timeMs: number;
		warmupMs: number;
		minimumSamples: number;
		seed: number;
	};
	runtime: RuntimeRow[];
	bundles: BundleSize[];
};

export function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? sorted[middle]!
		: (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export const LABELS = ADAPTERS;
export type Summary = {
	id: string;
	label: string;
	meanMs: number;
	spreadPercent: number;
	baseline: boolean;
};

export function summarize(
	results: Results,
	scenarioId: string,
	shape: Shape,
	size: number,
): Summary[] {
	const scenario = SCENARIOS.find((item) => item.id === scenarioId);
	if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
	const supported = new Set(
		adaptersFor(scenario).map((adapter) => adapter.id),
	);
	return LABELS.filter((label) => supported.has(label.id))
		.map((label) => {
			const rows = results.runtime.filter(
				(row) =>
					row.implementation === label.id &&
					row.scenario === scenarioId &&
					row.shape === shape &&
					row.size === size,
			);
			if (
				rows.length !== results.settings.rounds ||
				new Set(rows.map((row) => row.round)).size !==
					results.settings.rounds
			) {
				throw new Error(
					`Incomplete benchmark rounds: ${label.id}/${scenarioId}/${shape}/${size}`,
				);
			}
			const means = rows.map((row) => row.meanMs);
			if (means.some((mean) => !Number.isFinite(mean) || mean <= 0))
				throw new Error('Invalid benchmark timing');
			const meanMs = median(means);
			return {
				...label,
				meanMs,
				spreadPercent:
					(Math.max(...means.map((mean) => Math.abs(mean - meanMs))) /
						meanMs) *
					100,
				baseline: label.id === 'native' || label.id === 'native-cached',
			};
		})
		.sort((a, b) => a.meanMs - b.meanMs || a.id.localeCompare(b.id));
}

export type TimeUnit = 'µs' | 'ms';
export function timeUnit(ms: number): TimeUnit {
	return ms < 1 ? 'µs' : 'ms';
}

export function formatNumber(value: number): string {
	return value.toLocaleString('en-US', { maximumSignificantDigits: 3 });
}

export function formatTime(ms: number, unit: TimeUnit = timeUnit(ms)): string {
	return `${formatNumber(unit === 'µs' ? ms * 1_000 : ms)} ${unit}`;
}

export function formatBytes(bytes: number): string {
	return Math.abs(bytes) < 1_024
		? `${bytes} B`
		: `${(bytes / 1_024).toFixed(2)} KiB`;
}

function noiseMark(summary: Summary): string {
	return summary.spreadPercent > 20 ? '†' : '';
}

function overview(results: Results): string[] {
	const shape = results.settings.shapes.includes('shuffled')
		? 'shuffled'
		: results.settings.shapes[0]!;
	const lines = [
		'## Fastest observed at a glance',
		'',
		`For **${shape}** input. Each cell names the fastest observed entry and its time per complete sort. “Library” excludes the two native baselines. These are observations, not statistically proven winners.`,
		'',
		`| Workload / comparison | ${results.settings.sizes.map((size) => size.toLocaleString('en-US')).join(' | ')} |`,
		`| --- | ${results.settings.sizes.map(() => '---').join(' | ')} |`,
	];
	for (const scenario of SCENARIOS) {
		const groups = results.settings.sizes.map((size) =>
			summarize(results, scenario.id, shape, size),
		);
		for (const librariesOnly of [false, true]) {
			const cells = groups.map((group) => {
				const winner = group.find(
					(item) => !librariesOnly || !item.baseline,
				)!;
				return `${winner.label} — ${formatTime(winner.meanMs)}${noiseMark(winner)}`;
			});
			lines.push(
				`| ${scenario.id} · ${librariesOnly ? 'library' : 'overall'} | ${cells.join(' | ')} |`,
			);
		}
	}
	return [
		...lines,
		'',
		'µs = microseconds; **1,000 µs = 1 ms**. Lower is better. **†** marks more than 20% variation between round means; treat that ranking with caution.',
		'',
	];
}

export function renderReport(results: Results): string {
	const { metadata: meta, settings } = results;
	const labels = LABELS;
	const methodology = [
		'## Reproduce',
		'',
		'```sh',
		'bun install --frozen-lockfile',
		'bun run bench:check    # types, fixtures, adapter correctness and bundle smoke tests',
		'bun run bench          # short profile; writes BENCHMARKS.md, BENCHMARKS.html and benchmarks/results.json',
		'bun run bench:full     # exhaustive profile; writes benchmarks/full.md, full.html and full.json',
		'bun run bench:sizes    # bundle-only measurements; writes benchmarks/sizes.json',
		'```',
		'',
		'Bun installs dependencies and launches scripts; timings run on **Node through tsx**, not Bun. Close busy applications and repeat measurements in fresh processes. Commit the lockfile, source and generated results together. Both profiles include 10, 100, 1,000, 10,000 and 100,000 records. The short profile uses shuffled input, two rounds, 50 ms measurement and 20 ms warmup budgets with at least three samples. The 100,000-record cases dominate its runtime; expect roughly one to two minutes on a laptop, depending on hardware. The exhaustive profile adds all four input shapes with larger sampling budgets; it can take 10–15 minutes on a laptop. There are no timing thresholds in CI.',
		'',
		'## Workloads and inputs',
		'',
		'An e-commerce order dashboard is the shared use case. Each record has a customer, fulfillment status, creation timestamp, stored total and 1–12 line items. Money is integer cents; each line applies its percentage discount and rounds to cents before totals are summed.',
		'',
		'- **Stored total:** one inexpensive numeric key, ascending. Represents clicking a numeric table column.',
		'- **Fulfillment queue:** status rank ascending, creation timestamp descending, then nested customer surname ascending. Five statuses, 180 dates and ten surnames deliberately exercise secondary keys and ties.',
		'- **Computed total:** sum discounted line-item totals on demand, descending. Represents sorting derived values not already indexed or stored. Unlike a synthetic busy loop, this does useful work; an application that already caches this total should use the stored-total results instead.',
		'',
		'Arrays of **10, 100, 1,000, 10,000 and 100,000** records span a tiny dropdown/list, a small loaded table, a large table, client-side filtering, and a bulk export/offline workload. This measures sorting the entire loaded array, not server-side pagination or rendering.',
		'',
		'The exhaustive profile runs each workload with shuffled, already sorted, reversed and nearly sorted inputs; the short profile uses shuffled input only. Nearly sorted inputs start sorted, then swap 1% of record pairs (up to roughly 2% of positions). Seeded generation and Fisher–Yates shuffling are reproducible. Each round uses a different seed, shared by every implementation. About 5% of records duplicate all sort fields of their predecessor, ensuring stability is tested in the generated arrays of at least 100 records. Separate hand-built fixtures test ties for tiny inputs too. Equal-key results preserve the current input order; no artificial ID tie-breaker is added.',
		'',
		'## Fairness and scope',
		'',
		'- Every implementation returns a new array and preserves the original records. Copying, key extraction, temporary allocations and ordinary garbage collection are included in timings. Dataset generation, reference sorting, validation, imports and report generation are excluded.',
		'- Implementations that sort through a comparator use the modern non-mutating `Array.prototype.toSorted()`, including the native baseline, so the copy is measured the same way for each of them.',
		'- The handwritten native baseline short-circuits directly on the workload fields. A separate native decorate–sort–undecorate baseline computes keys once per item into a flat object with one field per key. This distinguishes library overhead from the benefits and costs of caching.',
		'- Orders, comparator chains, selectors and rule arrays are prepared once outside timing for **every** implementation that supports reuse. Per-call work imposed by a library API remains timed. This measures repeated sorting with a reused definition, not one-shot construction or module startup.',
		'- ts-order class means `Order.sort()` (cached keys); compiled sort means `compile(order).sort()` with the same keys. The compiled compare row uses `compile(order).compare`. Code generation is completed outside timing. These are steady-state measurements, not compile-time or break-even measurements. ts-order comparator means `by()` directly for one key, or `order()` for multiple keys. They import separate public entry points. ts-order uses the local production build, not the previously published npm version. The runner requires Node with `new Function` available and stops if code generation is blocked. The library itself falls back to normal ordering in such environments; these compiled timings do not predict that fallback’s performance.',
		'- Lodash uses the tree-shakable `lodash-es` ESM distribution, rather than charging for the entire CommonJS library. es-toolkit core and compatibility `orderBy` are separate rows; the compatibility variant caches extracted keys. Effect Order uses its public primitive orders and mapped/composed comparators. A separate Effect `Array.sortWith` variant caches single numeric keys. Neither Effect entry needs an Effect runtime. Existing core/comparator rows are retained rather than silently switching algorithms by workload.',
		'- Radashi uses its built-in numeric `sort` only for the two single-key workloads. The cached Effect variant is also restricted to one numeric key in this suite. Unsupported multi-key cells are **—**, not custom wrappers presented as built-in features. Natural sorting, locale collation, missing keys, heterogeneous values, conditional rules and invalid numbers are outside this comparison; they have different semantics across libraries. [benchmarks/complex.md](benchmarks/complex.md) compares ts-order with native comparators on those.',
		'- Correctness checks compare every output object against an independent handwritten reference, including exact tie order, before timing and after each warmup/measurement phase. Tests additionally freeze nested data and cover empty, singleton, tied, negative and zero-valued keys.',
		'',
		'## Measurement method',
		'',
		`Each cell is the **median of ${settings.rounds} round means**, per complete sort. A column uses **µs** if its fastest entry is below 1 ms, otherwise **ms**; all entries within that column use the same unit. Each cell also shows its time divided by the fastest entry’s time: **1.00×** is fastest, **2.00×** takes twice as long. Bold marks the lowest observed time, not a proven statistical win. A † flags over 20% round-to-round variation. Exact variation percentages are in the collapsed tables; they are **not confidence intervals**. Raw JSON also records each round’s sample count, mean, median, p99 and Tinybench relative margin of error.`,
		'',
		`Tinybench runs synchronously and sequentially: at least ${settings.timeMs} ms and ${settings.minimumSamples} samples per implementation per cell, preceded by at least ${settings.warmupMs} ms and three warmup iterations. Implementation order is deterministically shuffled for each group and round. Seeds start at ${settings.seed}. No outliers are removed; no forced garbage collection runs between samples.`,
		'',
		'With only two rounds, the displayed center averages the two round means; the deviation is just their half-range, not a robust uncertainty estimate. Round variation includes dataset differences, JIT state, allocation pressure and machine noise. Rounds share one process: these numbers do not estimate process-to-process uncertainty. Small differences and noisy cells should not be treated as wins. There is intentionally no aggregate score that weights unrelated workloads or hides unfavorable sizes.',
		'',
		'## Environment',
		'',
		`- Measured: ${meta.date}`,
		`- Node: ${meta.node}; V8: ${meta.v8}`,
		`- System: ${meta.platform}; CPU: ${meta.cpu}; RAM: ${meta.memoryGiB} GiB`,
		`- Base commit: \`${meta.commit}\`; working tree dirty: **${meta.dirty}**`,
		`- Benchmark source SHA-256: \`${meta.sourceHash}\` (library and benchmark TypeScript, package.json and bun.lock; generated reports excluded)`,
		'',
		'| Package | Version |',
		'| --- | --- |',
		...Object.entries(meta.versions).map(
			([name, version]) => `| ${name} | ${version} |`,
		),
		'',
		'The source hash records the tree at measurement time, not later report-template or CLI-profile edits. Re-rendering a saved result does not rerun its timings.',
		'',
	];
	const lines = [
		'# Sorting benchmarks',
		'',
		`[Interactive ranked charts](${settings.quick ? 'BENCHMARKS.html' : 'full.html'}) · ${settings.quick ? '[Historical exhaustive run, before review fixes](benchmarks/full.md)' : 'Exhaustive profile'}`,
		'',
		`Measured sizes: **${settings.sizes.map((size) => size.toLocaleString('en-US')).join(', ')}** records · ${settings.rounds} rounds · ${settings.shapes.join(', ')} input.`,
		'',
		...(settings.quick
			? [
					'**Short profile:** lower sampling budgets. Use for iteration, not definitive performance claims.',
					'',
				]
			: []),
		...overview(results),
		'## Runtime results',
		'',
		'The code behind every row is listed under [Sorting code](#sorting-code).',
		'',
		'**Time · relative time.** 1.00× is the fastest observed in that column; larger ratios are slower. Rows are ranked by the largest measured array. Native baselines are included. Expand the variation table before interpreting close results.',
		'',
	];
	for (const scenario of SCENARIOS) {
		lines.push(`### ${scenario.title}`, '');
		for (const shape of settings.shapes) {
			const groups = settings.sizes.map((size) =>
				summarize(results, scenario.id, shape, size),
			);
			const ranked = groups.at(-1)!;
			const header = `| Implementation | ${groups.map((group, i) => `${settings.sizes[i]!.toLocaleString('en-US')} (${timeUnit(group[0]!.meanMs)})`).join(' | ')} |`;
			const separator = `| --- | ${settings.sizes.map(() => '---:').join(' | ')} |`;
			lines.push(`#### ${shape}`, '', header, separator);
			for (const label of ranked) {
				const cells = groups.map((group) => {
					const item = group.find(
						(candidate) => candidate.id === label.id,
					)!;
					const unit = timeUnit(group[0]!.meanMs);
					const time = formatNumber(
						unit === 'µs' ? item.meanMs * 1_000 : item.meanMs,
					);
					const cell = `${time} · ${(item.meanMs / group[0]!.meanMs).toFixed(2)}×${noiseMark(item)}`;
					return item.meanMs === group[0]!.meanMs
						? `**${cell}**`
						: cell;
				});
				lines.push(`| ${label.label} | ${cells.join(' | ')} |`);
			}
			for (const unsupported of labels.filter(
				(label) => !ranked.some((item) => item.id === label.id),
			)) {
				lines.push(
					`| ${unsupported.label} | ${settings.sizes.map(() => '—').join(' | ')} |`,
				);
			}
			lines.push(
				'',
				'<details>',
				'<summary>Round-to-round variation (not confidence intervals)</summary>',
				'',
				`| Implementation | ${settings.sizes.map((size) => size.toLocaleString('en-US')).join(' | ')} |`,
				separator,
			);
			for (const label of ranked) {
				lines.push(
					`| ${label.label} | ${groups.map((group) => `±${group.find((item) => item.id === label.id)!.spreadPercent.toFixed(0)}%`).join(' | ')} |`,
				);
			}
			lines.push('', '</details>', '');
		}
	}
	lines.push(
		'## Bundle overhead',
		'',
		'Each result is a **complete working sorting example**, not an npm install size or the whole library. The same code used for timing is bundled individually for each workload. The native baseline contains the equivalent handwritten comparator. Each emitted bundle is executed and checked against the same reference before its size is accepted.',
		'',
		'esbuild bundles for browser ESM / ES2022 with minification, tree shaking and legal comments removed; gzip uses level 9. No source maps, external packages, runtime polyfills, data fixtures or benchmark runner are included. ts-order resolves to its built public exports. Application glue and selector code are included; native rows show the no-library cost. Each example is written for its workload, with the selectors inline, as an application would write it. The code is listed under **Sorting code**.',
		'',
		'Each workload is ranked by **gzip total**, smallest first. **Extra gzip** is the difference from the no-library handwritten example. B = bytes; KiB = 1,024 bytes. Deltas are example overhead, not context-independent library sizes: compression and shared application code are non-additive.',
		'',
	);
	for (const scenario of SCENARIOS) {
		const entries = results.bundles
			.filter((entry) => entry.scenario === scenario.id)
			.sort((a, b) => a.gzip - b.gzip);
		const expected = adaptersFor(scenario);
		if (
			entries.length !== expected.length ||
			new Set(entries.map((entry) => entry.implementation)).size !==
				expected.length ||
			expected.some(
				(label) =>
					!entries.some((entry) => entry.implementation === label.id),
			)
		)
			throw new Error('Incomplete bundle results');
		const baseline = entries.find(
			(entry) => entry.implementation === 'native',
		)!;
		lines.push(
			`### ${scenario.title}`,
			'',
			'| Implementation | Gzip total | Extra gzip vs native | Minified |',
			'| --- | ---: | ---: | ---: |',
		);
		for (const entry of entries) {
			const label = labels.find(
				(item) => item.id === entry.implementation,
			)!;
			const delta = entry.gzip - baseline.gzip;
			lines.push(
				`| ${label.label} | ${formatBytes(entry.gzip)} | ${delta > 0 ? '+' : ''}${formatBytes(delta)} | ${formatBytes(entry.minified)} |`,
			);
		}
		lines.push('');
	}
	lines.push(
		'## Sorting code',
		'',
		'The exact code that was timed and bundled, for every implementation and workload. Each module in `benchmarks/adapters/` exports one function per workload. That function runs once, before timing, to prepare any reusable definition. The function it returns is the one timed. Imports of the shared `Purchase` type, `Sorter` type and `computedTotal` helper from `benchmarks/cases.ts` are left out; `computedTotal` sums the discounted line items, rounding each line to cents.',
		'',
	);
	for (const scenario of SCENARIOS) {
		lines.push(`### ${scenario.title}`, '');
		for (const adapter of adaptersFor(scenario)) {
			lines.push(
				`#### ${adapter.label}`,
				'',
				'```ts',
				sourceFor(adapter.id, scenario.id),
				'```',
				'',
			);
		}
		const missing = labels.filter(
			(label) => !adaptersFor(scenario).includes(label),
		);
		if (missing.length)
			lines.push(
				`Not measured: ${missing.map((label) => label.label).join(', ')}. Their APIs take one numeric key.`,
				'',
			);
	}
	lines.push(
		'<details>',
		'<summary>Methodology, reproduction commands and environment</summary>',
		'',
		...methodology,
		'',
		'</details>',
		'',
	);
	lines.push(
		'',
		'## Limits',
		'',
		'These are deterministic synthetic orders with realistic operations, not a production trace. One machine and one Node/V8 version cannot establish browser, Bun, other Node-version or universal performance. The suite does not measure peak memory, cold imports, comparator construction, server/database sorting, or bundle reuse inside an existing application. Choose based on the workload and semantics you need; repeat measurements on your target runtime.',
		'',
	);
	return lines.join('\n');
}
