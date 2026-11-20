import type { ChartPaths, Results } from './report.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderChart } from './chart.js';
import { headline, renderReport } from './report.js';
import { ROOT } from './sizes.js';
import { renderBundleSvg, renderRuntimeSvg, renderWorkloadSvg } from './svg.js';

/** Write the Markdown report, its SVG charts and the interactive chart page. */
export function publish(results: Results): string[] {
	const quick = results.settings.quick;
	// The short profile publishes at the root, the exhaustive one in benchmarks/.
	const reportPath = quick ? 'BENCHMARKS.md' : 'benchmarks/full.md';
	const svgDir = 'benchmarks/charts';
	const prefix = quick ? '' : 'full-';
	// Each chart the report embeds, by path from the repository root.
	const charts = new Map<string, () => string>();
	const chart = (name: string, render: () => string) => {
		const path = `${svgDir}/${prefix}${name}.svg`;
		charts.set(path, render);
		return quick ? path : path.slice('benchmarks/'.length);
	};
	const { shape } = headline(results);
	const paths: ChartPaths = {
		runtime: (size) =>
			chart(`runtime-${size}`, () =>
				renderRuntimeSvg(results, shape, size),
			),
		workload: (scenario, input) =>
			chart(`workload-${scenario}-${input}`, () =>
				renderWorkloadSvg(results, scenario, input),
			),
		bundle: chart('bundle', () => renderBundleSvg(results)),
	};
	const files: [string, string][] = [
		[reportPath, renderReport(results, paths)],
		...[...charts].map(([path, render]): [string, string] => [
			path,
			render(),
		]),
		[
			quick ? 'BENCHMARKS.html' : 'benchmarks/full.html',
			renderChart(results),
		],
	];
	mkdirSync(resolve(ROOT, svgDir), { recursive: true });
	for (const [path, content] of files)
		writeFileSync(resolve(ROOT, path), content);
	return files.map(([path]) => path);
}
