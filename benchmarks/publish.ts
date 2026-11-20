import type { Results } from './report.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderChart } from './chart.js';
import { headline, renderReport } from './report.js';
import { ROOT } from './sizes.js';
import { renderBundleSvg, renderRuntimeSvg } from './svg.js';

/** Write the Markdown report, its SVG charts and the interactive chart page. */
export function publish(results: Results): string[] {
	const quick = results.settings.quick;
	// The short profile publishes at the root, the exhaustive one in benchmarks/.
	const reportPath = quick ? 'BENCHMARKS.md' : 'benchmarks/full.md';
	const svgDir = 'benchmarks';
	const prefix = quick ? '' : 'full-';
	const runtime = `${svgDir}/${prefix}runtime.svg`;
	const bundle = `${svgDir}/${prefix}bundle.svg`;
	const relative = (path: string) =>
		quick ? path : path.slice(svgDir.length + 1);
	const { shape, size } = headline(results);
	const files: [string, string][] = [
		[
			reportPath,
			renderReport(results, {
				runtime: relative(runtime),
				bundle: relative(bundle),
			}),
		],
		[runtime, renderRuntimeSvg(results, shape, size)],
		[bundle, renderBundleSvg(results)],
		[
			quick ? 'BENCHMARKS.html' : 'benchmarks/full.html',
			renderChart(results),
		],
	];
	for (const [path, content] of files)
		writeFileSync(resolve(ROOT, path), content);
	return files.map(([path]) => path);
}
