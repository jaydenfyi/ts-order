import type { Sorter } from './cases.js';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { adaptersFor } from './adapters.js';
import { makePurchases, SCENARIOS } from './cases.js';
import { validateSort } from './validate.js';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export type BundleSize = {
	scenario: string;
	implementation: string;
	minified: number;
	gzip: number;
};

export async function measureSizes(): Promise<BundleSize[]> {
	const sizes: BundleSize[] = [];
	for (const scenario of SCENARIOS) {
		const input = makePurchases(100);
		const expected = input.slice().sort(scenario.reference);
		for (const { id } of adaptersFor(scenario)) {
			const result = await build({
				stdin: {
					contents: `import { ${scenario.id} } from './benchmarks/adapters/${id}.ts';\nexport const sortOrders = ${scenario.id}();`,
					resolveDir: ROOT,
					sourcefile: `${id}-${scenario.id}.js`,
				},
				bundle: true,
				write: false,
				minify: true,
				format: 'esm',
				platform: 'browser',
				target: 'es2022',
				legalComments: 'none',
				treeShaking: true,
			});
			const output = result.outputFiles[0];
			assert(output, `Missing bundle for ${id}`);
			// Execute the measured bytes too: a tree-shaken but non-working example is not a size result.
			const bundled = (await import(
				`data:text/javascript;base64,${Buffer.from(output.contents).toString('base64')}`
			)) as { sortOrders: Sorter };
			validateSort(
				bundled.sortOrders,
				input,
				expected,
				`bundle ${id}/${scenario.id}`,
			);
			sizes.push({
				scenario: scenario.id,
				implementation: id,
				minified: output.contents.byteLength,
				gzip: gzipSync(output.contents, { level: 9 }).byteLength,
			});
		}
	}
	return sizes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const sizes = await measureSizes();
	await writeFile(
		new URL('./sizes.json', import.meta.url),
		`${JSON.stringify(sizes, null, 2)}\n`,
	);
	console.table(sizes);
}
