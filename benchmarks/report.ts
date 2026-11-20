import type { ScenarioId, Shape } from './cases.js';
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

/** Sorts per second, in full: whole numbers from 100 up, else 3 significant digits. */
export function formatOps(ms: number): string {
	const ops = 1_000 / ms;
	return ops >= 100
		? Math.round(ops).toLocaleString('en-US')
		: formatNumber(ops);
}

export function formatBytes(bytes: number): string {
	return Math.abs(bytes) < 1_024
		? `${bytes} B`
		: `${(bytes / 1_024).toFixed(2)} KiB`;
}

function noiseMark(summary: Summary): string {
	return summary.spreadPercent > 20 ? '†' : '';
}

// Summary rows, in groups. Native code comes first as the speed to aim for,
// then ts-order's own modes so they can be compared, then the other libraries.
const SUMMARY_GROUPS: { title: string; rows: Record<string, string> }[] = [
	{
		title: 'Native `Array.prototype.sort`',
		rows: {
			'native-cached': 'Cached keys',
			native: 'Handwritten comparator',
		},
	},
	{
		title: 'ts-order',
		rows: {
			'ts-order-compiled': '`compile()` + `sort()`',
			'ts-order-compiled-compare': '`compile()` + `compare`',
			'ts-order-class': '`Order` (not compiled)',
			'ts-order-comparator': '`ts-order/comparator`',
		},
	},
	{ title: 'Other libraries', rows: {} },
];
export const SUMMARY_BASELINE = 'ts-order-compiled';
const MEDALS = ['🥇', '🥈', '🥉'];

/** The measured size closest to 1,000 records, a typical list or table. */
export function headlineSize(sizes: number[]): number {
	const distance = (size: number) => Math.abs(Math.log10(size) - 3);
	return sizes.reduce((best, size) =>
		distance(size) < distance(best) ? size : best,
	);
}

/** Who wins a medal: each package once, and native code once. */
function owner(id: string): string {
	return LABELS.find((label) => label.id === id)!.package ?? 'native';
}

/** Medal for each entry: the first three owners, each with its smallest value. */
export function podium(
	entries: { id: string; value: number }[],
): Map<string, string> {
	const medals = new Map<string, string>();
	const seen = new Set<string>();
	for (const entry of [...entries].sort((a, b) => a.value - b.value)) {
		if (medals.size === MEDALS.length) break;
		if (seen.has(owner(entry.id))) continue;
		seen.add(owner(entry.id));
		medals.set(entry.id, MEDALS[medals.size]!);
	}
	return medals;
}

const NAMED = new Set(
	SUMMARY_GROUPS.flatMap((group) => Object.keys(group.rows)),
);

/**
 * Table rows in summary order: group headings, then their entries. Other
 * libraries come fastest first, by `rank` (lower is better).
 */
export function groupedRows(
	rank: (id: string) => number | undefined,
): ({ title: string } | { id: string; name: string })[] {
	const others = LABELS.filter((label) => !NAMED.has(label.id))
		.map((label) => ({ label, value: rank(label.id) ?? Infinity }))
		.sort((a, b) => a.value - b.value)
		.map(({ label }) => [label.id, label.label] as const);
	return SUMMARY_GROUPS.flatMap((group) => [
		{ title: group.title },
		...(Object.keys(group.rows).length
			? Object.entries(group.rows)
			: others
		).map(([id, name]) => ({ id, name })),
	]);
}

export function geometricMean(values: number[]): number | undefined {
	return values.length
		? Math.exp(
				values.reduce((sum, value) => sum + Math.log(value), 0) /
					values.length,
			)
		: undefined;
}

/**
 * A runtime table: one column per group of timings. Each cell shows sorts per
 * second and, in brackets, the speed relative to compiled ts-order `sort()`.
 */
function runtimeTable(
	columns: { heading: string; group: Summary[] }[],
): string[] {
	const prepared = columns.map(({ heading, group }) => ({
		heading,
		group,
		baseline: group.find((item) => item.id === SUMMARY_BASELINE)!,
		medals: podium(
			group.map((item) => ({ id: item.id, value: item.meanMs })),
		),
	}));
	const ratio = (id: string, column: (typeof prepared)[number]) => {
		const item = column.group.find((candidate) => candidate.id === id);
		return item && item.meanMs / column.baseline.meanMs;
	};
	const cell = (id: string, column: (typeof prepared)[number]) => {
		const item = column.group.find((candidate) => candidate.id === id);
		if (!item) return '—';
		// Relative speed: 2.0× sorts twice as many times per second.
		const speed = 1 / ratio(id, column)!;
		const text = `${formatOps(item.meanMs)} ops/s (${speed.toFixed(1)}×)${noiseMark(item)}`;
		const medal = column.medals.get(id);
		return medal ? `${medal} ${text}` : text;
	};
	const rows = groupedRows((id) =>
		geometricMean(prepared.flatMap((column) => ratio(id, column) ?? [])),
	);
	return [
		`| | ${prepared.map((column) => column.heading).join(' | ')} |`,
		`| --- | ${prepared.map(() => '---:').join(' | ')} |`,
		...rows.map((row) =>
			'title' in row
				? `| **${row.title}** | ${prepared.map(() => '').join(' | ')} |`
				: `| ${row.name} | ${prepared.map((column) => cell(row.id, column)).join(' | ')} |`,
		),
	];
}

function summaryTable(results: Results, shape: Shape, size: number): string[] {
	return runtimeTable(
		SCENARIOS.map((scenario) => ({
			heading: scenario.short,
			group: summarize(results, scenario.id, shape, size),
		})),
	);
}

/** Paths of the SVG charts, relative to the report. */
export type ChartPaths = {
	/** Sorts per second at one size, by workload. */
	runtime: (size: number) => string;
	/** Relative speed of one workload and input shape, by size. */
	workload: (scenario: ScenarioId, shape: Shape) => string;
	bundle: string;
};

/** The input shape and size that the summary and its chart show. */
export function headline(results: Results): { shape: Shape; size: number } {
	const { sizes, shapes } = results.settings;
	return {
		shape: shapes.includes('shuffled') ? 'shuffled' : shapes[0]!,
		size: headlineSize(sizes),
	};
}

function overview(results: Results, charts?: ChartPaths): string[] {
	const { sizes } = results.settings;
	const { shape, size } = headline(results);
	const count = (value: number) => value.toLocaleString('en-US');
	const lines = [
		'## Summary',
		'',
		`Sorts per second on **${count(size)} ${shape} records**, a typical list or table. Higher is faster. **(2.0×)** means twice as many sorts per second as compiled ts-order \`sort()\`. 🥇🥈🥉 mark the three fastest in each column. Each library, and native code, wins at most one medal, with its fastest entry.`,
		'',
		...(charts
			? [
					`![Bar chart of sorts per second on ${count(size)} ${shape} records, by library and workload. The table below has every value.](${charts.runtime(size)})`,
					'',
				]
			: []),
		...summaryTable(results, shape, size),
		'',
		...SCENARIOS.map(
			(scenario) =>
				`- **${scenario.short}:** ${scenario.title.toLowerCase()}.`,
		),
		...(SCENARIOS.every(
			(scenario) => adaptersFor(scenario).length === LABELS.length,
		)
			? []
			: [
					'- **—:** the library has no built-in way to sort this workload.',
				]),
		'- **†:** more than 20% variation between rounds. Treat close results in that cell with caution.',
		'',
	];
	for (const other of sizes.filter((value) => value !== size))
		lines.push(
			'<details>',
			`<summary>${count(other)} records</summary>`,
			'',
			...(charts
				? [
						`![Bar chart of sorts per second on ${count(other)} ${shape} records, by library and workload. The table below has every value.](${charts.runtime(other)})`,
						'',
					]
				: []),
			...summaryTable(results, shape, other),
			'',
			'</details>',
			'',
		);
	return lines;
}

export function renderReport(results: Results, charts?: ChartPaths): string {
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
		'- Lodash uses the tree-shakable `lodash-es` ESM distribution, rather than charging for the entire CommonJS library. es-toolkit core and compatibility `orderBy` are separate rows; the compatibility variant caches extracted keys, as Lodash `orderBy` does. es-toolkit core, Remeda, fast-sort, thenby and Radashi call the key functions on every comparison. Effect Order uses its public primitive orders and mapped/composed comparators. A separate Effect `Array.sortWith` variant caches single numeric keys. Neither Effect entry needs an Effect runtime. Existing core/comparator rows are retained rather than silently switching algorithms by workload.',
		'- Every library runs every workload with its own public API. Radashi `sort` takes one numeric key and Radashi has no way to chain comparators, so its fulfillment queue joins one `castComparator` per key with `||`. Effect `Array.sortWith` computes one key per item; its fulfillment queue makes that key a tuple, compared with `Order.Tuple`. Natural sorting, locale collation, missing keys, heterogeneous values, conditional rules and invalid numbers are outside this comparison; they have different semantics across libraries. [benchmarks/complex.md](benchmarks/complex.md) compares ts-order with native comparators on those.',
		'- Correctness checks compare every output object against an independent handwritten reference, including exact tie order, before timing and after each warmup/measurement phase. Tests additionally freeze nested data and cover empty, singleton, tied, negative and zero-valued keys.',
		'',
		'## Measurement method',
		'',
		`Each cell is based on the **median of ${settings.rounds} round means**, per complete sort, shown as sorts per second (1 second divided by that time). Each cell also shows its speed relative to compiled ts-order \`sort()\`: **2.0×** sorts twice as many times per second. A medal marks one of the three highest observed speeds, not a proven statistical win. A † flags over 20% round-to-round variation. Exact variation percentages are in the collapsed tables; they are **not confidence intervals**. Raw JSON also records each round’s sample count, mean, median, p99 and Tinybench relative margin of error.`,
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
		...overview(results, charts),
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
		'## Runtime results',
		'',
		'The code behind every row is listed under [Sorting code](#sorting-code).',
		'',
		'Same format as the summary: sorts per second, then the speed relative to compiled ts-order `sort()`. 🥇🥈🥉 mark the three fastest in each column, one medal per library. Expand the variation table before you trust a close result.',
		'',
	];
	for (const scenario of SCENARIOS) {
		lines.push(`### ${scenario.title}`, '');
		for (const shape of settings.shapes) {
			const groups = settings.sizes.map((size) =>
				summarize(results, scenario.id, shape, size),
			);
			lines.push(
				`#### ${shape}`,
				'',
				...(charts
					? [
							`![Bar chart of the speed of each implementation relative to compiled ts-order sort(), by array size. The table below has every value.](${charts.workload(scenario.id, shape)})`,
							'',
						]
					: []),
				...runtimeTable(
					groups.map((group, i) => ({
						heading: settings.sizes[i]!.toLocaleString('en-US'),
						group,
					})),
				),
			);
			const separator = `| --- | ${settings.sizes.map(() => '---:').join(' | ')} |`;
			const variation = (id: string) =>
				groups.map((group) => {
					const item = group.find((candidate) => candidate.id === id);
					return item ? `±${item.spreadPercent.toFixed(0)}%` : '—';
				});
			lines.push(
				'',
				'<details>',
				'<summary>Round-to-round variation (not confidence intervals)</summary>',
				'',
				`| Implementation | ${settings.sizes.map((size) => size.toLocaleString('en-US')).join(' | ')} |`,
				separator,
			);
			const rank = (id: string) =>
				geometricMean(
					groups.flatMap((group) => {
						const item = group.find(
							(candidate) => candidate.id === id,
						);
						const baseline = group.find(
							(candidate) => candidate.id === SUMMARY_BASELINE,
						)!;
						return item ? [item.meanMs / baseline.meanMs] : [];
					}),
				);
			for (const row of groupedRows(rank))
				lines.push(
					'title' in row
						? `| **${row.title}** | ${settings.sizes.map(() => '').join(' | ')} |`
						: `| ${row.name} | ${variation(row.id).join(' | ')} |`,
				);
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
		...(charts
			? [
					`![Bar chart of the gzip size of each complete sorting example, by library and workload. The table below has every value.](${charts.bundle})`,
					'',
				]
			: []),
		'Each cell is the **gzip size** of the whole example, then in brackets the extra gzip over the no-library handwritten example. 🥇🥈🥉 mark the three smallest in each column, one medal per library. B = bytes; KiB = 1,024 bytes. Deltas are example overhead, not context-independent library sizes: compression and shared application code are non-additive.',
		'',
	);
	const bundles = SCENARIOS.map((scenario) => {
		const entries = results.bundles.filter(
			(entry) => entry.scenario === scenario.id,
		);
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
		const medals = podium(
			entries.map((entry) => ({
				id: entry.implementation,
				value: entry.gzip,
			})),
		);
		return { scenario, entries, baseline, medals };
	});
	const bundleRows = groupedRows((id) =>
		geometricMean(
			bundles.flatMap(({ entries }) =>
				entries.flatMap((entry) =>
					entry.implementation === id ? [entry.gzip] : [],
				),
			),
		),
	);
	const bundleTable = (
		cell: (entry: BundleSize, column: (typeof bundles)[number]) => string,
	) => [
		`| | ${SCENARIOS.map((scenario) => scenario.short).join(' | ')} |`,
		`| --- | ${SCENARIOS.map(() => '---:').join(' | ')} |`,
		...bundleRows.map((row) =>
			'title' in row
				? `| **${row.title}** | ${SCENARIOS.map(() => '').join(' | ')} |`
				: `| ${row.name} | ${bundles
						.map((column) => {
							const entry = column.entries.find(
								(candidate) =>
									candidate.implementation === row.id,
							);
							return entry ? cell(entry, column) : '—';
						})
						.join(' | ')} |`,
		),
	];
	lines.push(
		...bundleTable((entry, column) => {
			const delta = entry.gzip - column.baseline.gzip;
			const text = `${formatBytes(entry.gzip)} (${delta > 0 ? '+' : ''}${formatBytes(delta)})`;
			const medal = column.medals.get(entry.implementation);
			return medal ? `${medal} ${text}` : text;
		}),
		'',
		'<details>',
		'<summary>Minified sizes, before gzip</summary>',
		'',
		...bundleTable((entry) => formatBytes(entry.minified)),
		'',
		'</details>',
		'',
	);
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
