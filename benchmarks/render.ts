// Re-render the reports from saved results, without timing anything again.
import type { Results } from './report.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publish } from './publish.js';
import { ROOT } from './sizes.js';

const full = process.argv.includes('--full');
const results = JSON.parse(
	readFileSync(
		resolve(
			ROOT,
			full ? 'benchmarks/full.json' : 'benchmarks/results.json',
		),
		'utf8',
	),
) as Results;
console.log(`Saved ${publish(results).join(', ')}`);
