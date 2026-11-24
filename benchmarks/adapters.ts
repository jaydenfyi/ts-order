import type { ScenarioId, Sorter } from './cases.js';
import { readFileSync } from 'node:fs';
import * as effectCached from './adapters/effect-cached.js';
import * as effect from './adapters/effect.js';
import * as esToolkitCompat from './adapters/es-toolkit-compat.js';
import * as esToolkit from './adapters/es-toolkit.js';
import * as fastSort from './adapters/fast-sort.js';
import * as lodash from './adapters/lodash.js';
import * as nativeCached from './adapters/native-cached.js';
import * as native from './adapters/native.js';
import * as naturalOrderby from './adapters/natural-orderby.js';
import * as radashi from './adapters/radashi.js';
import * as rambda from './adapters/rambda.js';
import * as ramda from './adapters/ramda.js';
import * as remeda from './adapters/remeda.js';
import * as sortEs from './adapters/sort-es.js';
import * as sortOn from './adapters/sort-on.js';
import * as thenby from './adapters/thenby.js';
import * as classSort from './adapters/ts-order-class.js';
import * as comparatorSort from './adapters/ts-order-comparator.js';
import * as compiledCompare from './adapters/ts-order-compiled-compare.js';
import * as compiledSort from './adapters/ts-order-compiled.js';

/**
 * One implementation. Each module exports a factory per workload it
 * supports, named after the workload. The factory prepares the reusable
 * definition once, outside timing; the function it returns is timed.
 */
export type Adapter = {
	id: string;
	label: string;
	package: string | null;
	factories: Partial<Record<ScenarioId, () => Sorter>>;
};

export const ADAPTERS: Adapter[] = [
	{
		id: 'native',
		label: 'Native handwritten',
		package: null,
		factories: native,
	},
	{
		id: 'native-cached',
		label: 'Native cached keys',
		package: null,
		factories: nativeCached,
	},
	{
		id: 'ts-order-class',
		label: 'ts-order class',
		package: 'ts-order',
		factories: classSort,
	},
	{
		id: 'ts-order-comparator',
		label: 'ts-order comparator',
		package: 'ts-order',
		factories: comparatorSort,
	},
	{
		id: 'ts-order-compiled',
		label: 'ts-order compiled sort',
		package: 'ts-order',
		factories: compiledSort,
	},
	{
		id: 'ts-order-compiled-compare',
		label: 'ts-order compiled compare',
		package: 'ts-order',
		factories: compiledCompare,
	},
	{
		id: 'lodash',
		label: 'Lodash (lodash-es)',
		package: 'lodash-es',
		factories: lodash,
	},
	{
		id: 'es-toolkit',
		label: 'es-toolkit core',
		package: 'es-toolkit',
		factories: esToolkit,
	},
	{
		id: 'es-toolkit-compat',
		label: 'es-toolkit compat (cached)',
		package: 'es-toolkit',
		factories: esToolkitCompat,
	},
	{
		id: 'fast-sort',
		label: 'fast-sort',
		package: 'fast-sort',
		factories: fastSort,
	},
	{ id: 'remeda', label: 'Remeda', package: 'remeda', factories: remeda },
	{ id: 'thenby', label: 'thenby', package: 'thenby', factories: thenby },
	{
		id: 'effect',
		label: 'Effect Order',
		package: 'effect',
		factories: effect,
	},
	{
		id: 'effect-cached',
		label: 'Effect Array.sortWith (cached)',
		package: 'effect',
		factories: effectCached,
	},
	{
		id: 'radashi',
		label: 'Radashi sort',
		package: 'radashi',
		factories: radashi,
	},
	{
		id: 'ramda',
		label: 'Ramda sortWith',
		package: 'ramda',
		factories: ramda,
	},
	{
		id: 'rambda',
		label: 'Rambda sortWith',
		package: 'rambda',
		factories: rambda,
	},
	{
		id: 'natural-orderby',
		label: 'natural-orderby',
		package: 'natural-orderby',
		factories: naturalOrderby,
	},
	{ id: 'sort-on', label: 'sort-on', package: 'sort-on', factories: sortOn },
	{ id: 'sort-es', label: 'sort-es', package: 'sort-es', factories: sortEs },
];

export function adaptersFor(scenario: { id: ScenarioId }): Adapter[] {
	return ADAPTERS.filter((adapter) => adapter.factories[scenario.id]);
}

export function sortersFor(scenario: {
	id: ScenarioId;
}): { id: string; label: string; sort: Sorter }[] {
	return adaptersFor(scenario).map((adapter) => ({
		id: adapter.id,
		label: adapter.label,
		sort: adapter.factories[scenario.id]!(),
	}));
}

/**
 * The code a reader needs for one adapter's workload: its package imports
 * and its factory, exactly as in `adapters/<id>.ts`.
 */
export function sourceFor(id: string, scenario: ScenarioId): string {
	const source = readFileSync(
		new URL(`./adapters/${id}.ts`, import.meta.url),
		'utf8',
	);
	const imports = source
		.split('\n')
		.filter((line) => line.startsWith('import ') && !line.includes("'../"));
	const factory = new RegExp(
		`^export function ${scenario}\\(\\)[\\s\\S]*?^\\}$`,
		'm',
	).exec(source);
	if (!factory) throw new Error(`Missing ${scenario} factory in ${id}`);
	return [...imports, ...(imports.length ? [''] : []), factory[0]].join('\n');
}
