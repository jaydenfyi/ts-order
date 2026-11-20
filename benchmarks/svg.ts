import type { Shape } from './cases.js';
import type { Results } from './report.js';
import { SCENARIOS } from './cases.js';
import {
	formatBytes,
	formatNumber,
	formatTime,
	geometricMean,
	groupedRows,
	LABELS,
	podium,
	summarize,
	SUMMARY_BASELINE,
	timeUnit,
} from './report.js';

// Static SVG charts for the Markdown report. They are images, so they have no
// hover layer: the tables next to them carry every value.

const WIDTH = 960;
const LABEL_WIDTH = 210;
// Space after the longest bar for its value label.
const VALUE_ROOM = 92;
const PANEL_GAP = 28;
const ROW = 22;
const BAR = 14;
const GROUP_GAP = 14;
const PLACES = ['1st', '2nd', '3rd'];

const STYLE = `
	.surface { fill: #fcfcfb; }
	.title { fill: #0b0b0b; font-size: 16px; font-weight: 600; }
	.subtitle, .value { fill: #52514e; font-size: 12px; }
	.place { fill: #0b0b0b; font-weight: 600; }
	.label { fill: #0b0b0b; font-size: 12px; }
	.group { fill: #52514e; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
	.panel { fill: #0b0b0b; font-size: 13px; font-weight: 600; }
	.tick, .missing { fill: #898781; font-size: 11px; font-variant-numeric: tabular-nums; }
	.grid { stroke: #e1e0d9; stroke-width: 1; }
	.axis { stroke: #c3c2b7; stroke-width: 1; }
	.ts-order { fill: #2a78d6; }
	.native { fill: #eb6834; }
	.other { fill: #898781; }
	@media (prefers-color-scheme: dark) {
		.surface { fill: #1a1a19; }
		.title, .label, .panel { fill: #f0efec; }
		.subtitle, .value, .group { fill: #c3c2b7; }
		.place { fill: #f0efec; }
		.grid { stroke: #2c2c2a; }
		.axis { stroke: #383835; }
		.ts-order { fill: #3987e5; }
		.native { fill: #d95926; }
	}
	text { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
`;

function escape(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

/** Strip the Markdown code spans that the table row names use. */
function plain(name: string): string {
	return name.replaceAll('`', '');
}

function kind(id: string): 'ts-order' | 'native' | 'other' {
	const owner = LABELS.find((label) => label.id === id)!.package;
	return owner === 'ts-order' ? 'ts-order' : owner ? 'other' : 'native';
}

/** Axis ticks from 0: at most 5 steps of 1, 2, 2.5 or 5 times a power of ten. */
function niceTicks(max: number): number[] {
	const power = 10 ** Math.floor(Math.log10(max / 5));
	const step = [1, 2, 2.5, 5, 10]
		.map((factor) => factor * power)
		.find((candidate) => max / candidate <= 5)!;
	return Array.from(
		{ length: Math.ceil(max / step - 1e-9) + 1 },
		(_, i) => i * step,
	);
}

/** A path for a horizontal bar: square at the baseline, 4px round data end. */
function bar(x: number, y: number, width: number, height: number): string {
	const r = Math.min(4, width / 2, height / 2);
	return `M${x},${y}h${width - r}a${r},${r} 0 0 1 ${r},${r}v${height - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${r - width}z`;
}

type Panel = {
	title: string;
	values: Map<string, number>;
	format: (value: number) => string;
};

/**
 * Horizontal bars in one row per entry, in the table's row order, with one
 * panel per column on a shared linear axis. The three medal holders in each
 * panel are labelled with their place and value.
 */
function barChart(options: {
	title: string;
	subtitle: string;
	rows: ReturnType<typeof groupedRows>;
	panels: Panel[];
	/** The number of a tick, in the axis unit. */
	tickFormat: (value: number) => string;
	/** The axis unit, printed after the last tick only. */
	unit: string;
}): string {
	const { rows, panels } = options;
	const top = 96;
	const panelWidth =
		(WIDTH - LABEL_WIDTH - 24 - PANEL_GAP * (panels.length - 1)) /
		panels.length;
	const max = Math.max(
		...panels.flatMap((panel) => [...panel.values.values()]),
	);
	const ticks = niceTicks(max);
	const scale = (value: number) =>
		(value / ticks.at(-1)!) * (panelWidth - VALUE_ROOM);
	const medals = panels.map((panel) =>
		podium([...panel.values].map(([id, value]) => ({ id, value }))),
	);

	let y = top;
	const body: string[] = [];
	for (const row of rows) {
		if ('title' in row) {
			y += y === top ? 0 : GROUP_GAP;
			body.push(
				`<text class="group" x="16" y="${y + 14}">${escape(plain(row.title))}</text>`,
			);
			y += ROW;
			continue;
		}
		const middle = y + ROW / 2;
		body.push(
			`<text class="label" x="16" y="${middle + 4}">${escape(plain(row.name))}</text>`,
		);
		panels.forEach((panel, i) => {
			const x = LABEL_WIDTH + i * (panelWidth + PANEL_GAP);
			const value = panel.values.get(row.id);
			if (value === undefined) {
				body.push(
					`<text class="missing" x="${x + 4}" y="${middle + 4}">not supported</text>`,
				);
				return;
			}
			const width = Math.max(scale(value), 2);
			body.push(
				`<path class="${kind(row.id)}" d="${bar(x, middle - BAR / 2, width, BAR)}"><title>${escape(`${plain(row.name)}, ${panel.title}: ${panel.format(value)}`)}</title></path>`,
			);
			const place = [...medals[i]!.keys()].indexOf(row.id);
			body.push(
				`<text class="value${place === -1 ? '' : ' place'}" x="${x + width + 6}" y="${middle + 4}">${place === -1 ? '' : `${PLACES[place]} · `}${escape(panel.format(value))}</text>`,
			);
		});
		y += ROW;
	}
	const bottom = y + 8;
	// Label every gridline, or every other one when they sit too close.
	const every = scale(ticks[1]!) < 48 ? 2 : 1;
	const lastLabelled = ticks.length - 1 - ((ticks.length - 1) % every);
	const axes = panels.flatMap((panel, i) => {
		const x = LABEL_WIDTH + i * (panelWidth + PANEL_GAP);
		return [
			`<text class="panel" x="${x}" y="${top - 12}">${escape(panel.title)}</text>`,
			...ticks.map((tick, t) => {
				const line = `<line class="${tick ? 'grid' : 'axis'}" x1="${x + scale(tick)}" x2="${x + scale(tick)}" y1="${top - 4}" y2="${bottom}"/>`;
				if (t % every) return line;
				const label =
					options.tickFormat(tick) +
					(t === lastLabelled ? ` ${options.unit}` : '');
				return `${line}<text class="tick" x="${x + scale(tick)}" y="${bottom + 16}" text-anchor="${tick ? 'middle' : 'start'}">${escape(label)}</text>`;
			}),
		];
	});
	const legend = [
		['ts-order', 'ts-order'],
		['native', 'Native Array.prototype.sort'],
		['other', 'Other libraries'],
	].map(([className, text], i, all) => {
		// About 7px per character at 12px, plus the swatch and a gap.
		const x =
			16 +
			all.slice(0, i).reduce((sum, [, t]) => sum + t!.length * 7 + 40, 0);
		return `<rect class="${className}" x="${x}" y="52" width="12" height="12" rx="2"/><text class="label" x="${x + 18}" y="62">${escape(text!)}</text>`;
	});
	const height = bottom + 32;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escape(options.title)}">`,
		`<style>${STYLE}</style>`,
		`<rect class="surface" width="${WIDTH}" height="${height}" rx="8"/>`,
		`<text class="title" x="16" y="26">${escape(options.title)}</text>`,
		`<text class="subtitle" x="16" y="44">${escape(options.subtitle)}</text>`,
		...legend,
		...axes,
		...body,
		'</svg>',
		'',
	].join('\n');
}

/** Time per sort at one size, one panel per workload. */
export function renderRuntimeSvg(
	results: Results,
	shape: Shape,
	size: number,
): string {
	const groups = SCENARIOS.map((scenario) =>
		summarize(results, scenario.id, shape, size),
	);
	const rows = groupedRows((id) =>
		geometricMean(
			groups.flatMap((group) => {
				const item = group.find((candidate) => candidate.id === id);
				const baseline = group.find(
					(candidate) => candidate.id === SUMMARY_BASELINE,
				)!;
				return item ? [item.meanMs / baseline.meanMs] : [];
			}),
		),
	);
	// The unit of the fastest entry, as in the tables.
	const unit = timeUnit(
		Math.min(...groups.flat().map((item) => item.meanMs)),
	);
	return barChart({
		title: `Time to sort ${size.toLocaleString('en-US')} ${shape} records`,
		subtitle:
			'Shorter bars are faster. 1st, 2nd and 3rd mark the three fastest in each workload, one place per library.',
		rows,
		panels: SCENARIOS.map((scenario, i) => ({
			title: scenario.short,
			values: new Map(groups[i]!.map((item) => [item.id, item.meanMs])),
			format: (value) => formatTime(value, unit),
		})),
		tickFormat: (value) =>
			formatNumber(unit === 'µs' ? value * 1_000 : value),
		unit,
	});
}

/** Gzip size of each complete example, one panel per workload. */
export function renderBundleSvg(results: Results): string {
	const panels = SCENARIOS.map((scenario) => ({
		title: scenario.short,
		values: new Map(
			results.bundles
				.filter((entry) => entry.scenario === scenario.id)
				.map((entry) => [entry.implementation, entry.gzip / 1_024]),
		),
		format: (kib: number) => formatBytes(Math.round(kib * 1_024)),
	}));
	const rows = groupedRows((id) =>
		geometricMean(panels.flatMap((panel) => panel.values.get(id) ?? [])),
	);
	return barChart({
		title: 'Gzip size of each complete sorting example',
		subtitle:
			'Shorter bars are smaller. 1st, 2nd and 3rd mark the three smallest in each workload, one place per library.',
		rows,
		panels,
		tickFormat: (kib) => kib.toLocaleString('en-US'),
		unit: 'KiB',
	});
}
