import type { Results } from './report.js';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { adaptersFor, sortersFor, sourceFor } from './adapters.js';
import {
	makePurchases,
	SCENARIOS,
	shapeInput,
	SHAPES,
	SIZES,
} from './cases.js';
import { renderChart } from './chart.js';
import {
	formatBytes,
	formatTime,
	renderReport,
	summarize,
	timeUnit,
} from './report.js';
import { renderBundleSvg, renderRuntimeSvg } from './svg.js';
import { validateSort } from './validate.js';

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function fixture(): Results {
	return {
		metadata: {
			date: '2026-11-20',
			node: 'v24',
			v8: 'test',
			platform: 'test',
			cpu: '<test>',
			memoryGiB: 16,
			commit: 'test',
			dirty: false,
			sourceHash: 'test',
			versions: {},
		},
		settings: {
			quick: true,
			sizes: [10, 100_000],
			shapes: ['shuffled'],
			rounds: 2,
			timeMs: 50,
			warmupMs: 20,
			minimumSamples: 3,
			seed: 42,
		},
		runtime: SCENARIOS.flatMap((scenario) =>
			[10, 100_000].flatMap((size) =>
				sortersFor(scenario).flatMap((sorter, index) =>
					[0, 1].map((round) => ({
						round,
						size,
						scenario: scenario.id,
						shape: 'shuffled' as const,
						implementation: sorter.id,
						meanMs:
							(size === 10 ? 0.001 : 2) *
							(index + 1) *
							(1 + round / 10),
						medianMs: 1,
						p99Ms: 1,
						rmePercent: 1,
						samples: 3,
					})),
				),
			),
		),
		bundles: SCENARIOS.flatMap((scenario) =>
			sortersFor(scenario).map((sorter, index) => ({
				scenario: scenario.id,
				implementation: sorter.id,
				minified: 200 * (index + 1),
				gzip: 100 * (index + 1),
			})),
		),
	};
}

describe('benchmark presentation', () => {
	it('covers both endpoints, including correct sorting of ten-item arrays', () => {
		expect(SIZES).toEqual([10, 100, 1_000, 10_000, 100_000]);
		for (const scenario of SCENARIOS) {
			for (const shape of SHAPES) {
				const input = shapeInput(makePurchases(10), scenario, shape);
				const expected = input.slice().sort(scenario.reference);
				for (const sorter of sortersFor(scenario))
					validateSort(sorter.sort, input, expected, sorter.label);
			}
		}
	});

	it('uses readable time units without rounding tiny sorts to zero', () => {
		expect(formatTime(0.00085)).toBe('0.85 µs');
		expect(formatTime(0.125)).toBe('125 µs');
		expect(formatTime(1.25)).toBe('1.25 ms');
		expect(formatTime(1.25, 'µs')).toBe('1,250 µs');
		expect(timeUnit(1)).toBe('ms');
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2_048)).toBe('2.00 KiB');
	});

	it('ranks round medians and distinguishes native baselines from libraries', () => {
		const results = fixture();
		const ranked = summarize(results, 'total', 'shuffled', 10);
		expect(ranked[0]!.id).toBe('native');
		expect(ranked[0]!.meanMs).toBeCloseTo(0.00105);
		expect(ranked[0]!.spreadPercent).toBeCloseTo(4.7619);
		expect(ranked.find((item) => !item.baseline)!.id).toBe(
			'ts-order-class',
		);
	});

	it('rejects missing, duplicated or invalid timings instead of inventing a rank', () => {
		const missing = fixture();
		missing.runtime.shift();
		expect(() => summarize(missing, 'total', 'shuffled', 10)).toThrow(
			'Incomplete',
		);
		const duplicated = fixture();
		duplicated.runtime[1]!.round = 0;
		expect(() => summarize(duplicated, 'total', 'shuffled', 10)).toThrow(
			'Incomplete',
		);
		const invalid = fixture();
		invalid.runtime[0]!.meanMs = 0;
		expect(() => summarize(invalid, 'total', 'shuffled', 10)).toThrow(
			'Invalid',
		);
	});

	it('puts winners first, labels units, shows relative time, and retains uncertainty', () => {
		const results = fixture();
		results.runtime[0]!.meanMs = 0.004;
		const markdown = renderReport(results);
		expect(markdown.indexOf('## Summary')).toBeLessThan(
			markdown.indexOf('## Runtime results'),
		);
		expect(markdown.indexOf('## Runtime results')).toBeLessThan(
			markdown.indexOf('## Reproduce'),
		);
		expect(markdown).toContain('| | 10 | 100,000 |');
		expect(markdown).toContain('🥇');
		expect(markdown).toMatch(
			/\| `compile\(\)` \+ `sort\(\)` \| .*\(1\.0×\)/,
		);
		expect(markdown).toContain('†');
		expect(markdown).toContain(
			'Round-to-round variation (not confidence intervals)',
		);
		expect(markdown).toContain('es-toolkit compat (cached)');
		expect(markdown).toContain('`compile()` + `compare`');
		expect(markdown).toContain('Minified sizes, before gzip');
		const broken = fixture();
		broken.bundles.pop();
		expect(() => renderReport(broken)).toThrow('Incomplete bundle');
	});

	it('shows the timed code of every implementation for every workload', () => {
		const report = renderReport(fixture());
		const section = report.slice(report.indexOf('## Sorting code'));
		for (const scenario of SCENARIOS) {
			for (const adapter of adaptersFor(scenario)) {
				const code = sourceFor(adapter.id, scenario.id);
				expect(code).toMatch(
					new RegExp(`^export function ${scenario.id}\\(\\)`, 'm'),
				);
				expect(section).toContain(`\`\`\`ts\n${code}\n\`\`\``);
			}
		}
		expect(sourceFor('lodash', 'total')).toContain("from 'lodash-es'");
		expect(sourceFor('native', 'total')).not.toContain('import');
		expect(() => sourceFor('native', 'unknown' as 'total')).toThrow(
			'Missing',
		);
	});

	it('colours measured values from best to worst, keeping ties equal', () => {
		const results = fixture();
		const html = renderChart(results);
		const firstChart = html
			.split('data-runtime="total/shuffled/10"')[1]!
			.split('</figure>')[0]!;
		const hues = [...firstChart.matchAll(/style="--heat:([\d.]+)"/g)].map(
			(match) => Number(match[1]),
		);
		expect(hues[0]).toBe(165);
		expect(hues.at(-1)).toBe(25);
		expect(hues).toEqual([...hues].sort((a, b) => b - a));
		expect(hues[7]).toBe(95);
		expect(html).toContain('Colours compare values within each chart');
		expect(html.indexOf('<h2>Less time')).toBeLessThan(
			html.indexOf('<details>'),
		);
		for (const row of results.runtime) row.meanMs = 1;
		for (const entry of results.bundles) entry.gzip = 100;
		const tied = renderChart(results);
		const tiedHues = [
			...tied.matchAll(/class="row[^"]*" style="--heat:([\d.]+)"/g),
		].map((match) => match[1]);
		expect(tiedHues.length).toBeGreaterThan(0);
		expect(new Set(tiedHues)).toEqual(new Set(['165.0']));
		expect(tied).not.toMatch(/NaN|Infinity/);
	});

	it('renders self-contained charts with every size and correct selector behavior', () => {
		const html = renderChart(fixture());
		expect(html).toContain('<option value="10"');
		expect(html).toContain('<option value="100000"');
		expect(html).toContain('data-runtime="computed/shuffled/10"');
		expect(html).toContain('&lt;test&gt;');
		expect(html).toContain('style="--rows:15"');
		for (const scenario of SCENARIOS) {
			expect(html).toContain(`data-code="${scenario.id}"`);
			expect(html).toContain(
				escapeHtml(sourceFor('ts-order-class', scenario.id)),
			);
			expect(html).toContain(
				escapeHtml(sourceFor('native', scenario.id)),
			);
		}
		// Comparators in the samples contain < and >, so they must arrive escaped.
		expect(escapeHtml(sourceFor('native', 'fulfillment'))).toContain(
			'&lt;',
		);
		expect(html).toContain('purchase.customer.lastName');
		expect(html).not.toContain('height:528px');
		expect(html).not.toContain('<script src=');
		const listeners = new Map<string, () => void>();
		const controls = Object.fromEntries(
			Object.entries({
				scenario: 'total',
				size: '100000',
				shape: 'shuffled',
			}).map(([id, value]) => [
				id,
				{
					value,
					addEventListener: (_event: string, callback: () => void) =>
						listeners.set(id, callback),
				},
			]),
		);
		const figures = [
			{ dataset: { runtime: 'total/shuffled/100000' }, hidden: true },
			{ dataset: { runtime: 'total/shuffled/10' }, hidden: true },
			{ dataset: { runtime: 'computed/shuffled/10' }, hidden: true },
		];
		const code = [
			{ dataset: { code: 'total' }, hidden: true },
			{ dataset: { code: 'computed' }, hidden: true },
		];
		const bundles = [
			{ dataset: { bundle: 'total' }, hidden: true },
			{ dataset: { bundle: 'computed' }, hidden: true },
		];
		const script = html.match(/<script>([\s\S]*)<\/script>/)![1]!;
		runInNewContext(script, {
			document: {
				getElementById: (id: string) => controls[id],
				querySelectorAll: (selector: string) =>
					selector === '[data-runtime]'
						? figures
						: selector === '[data-code]'
							? code
							: bundles,
			},
		});
		expect(figures.map((figure) => figure.hidden)).toEqual([
			false,
			true,
			true,
		]);
		controls.size!.value = '10';
		listeners.get('size')!();
		expect(figures.map((figure) => figure.hidden)).toEqual([
			true,
			false,
			true,
		]);
		controls.scenario!.value = 'computed';
		listeners.get('scenario')!();
		expect(figures.map((figure) => figure.hidden)).toEqual([
			true,
			true,
			false,
		]);
		expect(bundles.map((figure) => figure.hidden)).toEqual([true, false]);
		expect(code.map((figure) => figure.hidden)).toEqual([true, false]);
	});
	it('draws a labelled bar for every measured entry, with places for the top three', () => {
		const results = fixture();
		const svg = renderRuntimeSvg(results, 'shuffled', 10);
		const bars = SCENARIOS.reduce(
			(sum, scenario) => sum + adaptersFor(scenario).length,
			0,
		);
		expect(svg.match(/<path /g)).toHaveLength(bars);
		expect(svg.match(/class="value/g)).toHaveLength(bars);
		for (const place of ['1st', '2nd', '3rd'])
			expect(svg.match(new RegExp(`>${place} · `, 'g'))).toHaveLength(
				SCENARIOS.length,
			);
		expect(renderBundleSvg(results)).toContain('KiB');
		expect(
			renderReport(results, { runtime: 'a.svg', bundle: 'b.svg' }),
		).toMatch(/!\[[^\]]+\]\(a\.svg\)[\s\S]*!\[[^\]]+\]\(b\.svg\)/);
	});
});
