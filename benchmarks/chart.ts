import type { Results, Summary } from './report.js';
import { sourceFor } from './adapters.js';
import { SCENARIOS } from './cases.js';
import {
	formatBytes,
	formatTime,
	LABELS,
	summarize,
	timeUnit,
} from './report.js';

function escape(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

// Normalize measured values, not rank: equal results must have equal colours.
function heatStyle(value: number, best: number, worst: number): string {
	const fraction = worst === best ? 0 : (value - best) / (worst - best);
	return `--heat:${(165 - fraction * 140).toFixed(1)}`;
}

function runtimeBars(group: Summary[]): string {
	const fastest = group[0]!;
	const slowest = group.at(-1)!;
	const unit = timeUnit(fastest.meanMs);
	return group
		.map((item, rank) => {
			const variation = `Round variation ±${item.spreadPercent.toFixed(0)}%; not a confidence interval`;
			return `<div class="row ${rank === 0 ? 'fastest' : ''}" style="${heatStyle(item.meanMs, fastest.meanMs, slowest.meanMs)}">
			<div class="name">${rank + 1}. ${escape(item.label)}${item.baseline ? '<small>Native baseline</small>' : ''}</div>
			<div class="track" aria-hidden="true"><i style="width:${(item.meanMs / slowest.meanMs) * 100}%"></i></div>
			<div class="value" title="${variation}">${formatTime(item.meanMs, unit)}<small>${(item.meanMs / fastest.meanMs).toFixed(2)}× time${item.spreadPercent > 20 ? ' · noisy †' : ''}</small></div>
		</div>`;
		})
		.join('');
}

export function renderChart(results: Results): string {
	const { settings, metadata } = results;
	const runtime: string[] = [];
	const bundles: string[] = [];
	const code: string[] = [];
	const defaultSize = settings.sizes.at(-1)!;
	const defaultShape = settings.shapes[0]!;
	for (const scenario of SCENARIOS) {
		code.push(`<figure data-code="${scenario.id}" ${scenario.id === SCENARIOS[0]!.id ? '' : 'hidden'}>
			<figcaption><strong>${escape(scenario.title)}</strong><br>Every implementation returns this same order; only the API differs. The ts-order definition is shown first, then the equivalent handwritten comparator.</figcaption>
			<pre class="code"><code>${escape(sourceFor('ts-order-class', scenario.id))}</code></pre>
			<pre class="code"><code>${escape(sourceFor('native', scenario.id))}</code></pre>
		</figure>`);
		for (const shape of settings.shapes) {
			for (const size of settings.sizes) {
				const group = summarize(results, scenario.id, shape, size);
				const bestLibrary = group.find((item) => !item.baseline)!;
				const selected =
					scenario.id === SCENARIOS[0]!.id &&
					size === defaultSize &&
					shape === defaultShape;
				runtime.push(`<figure data-runtime="${scenario.id}/${shape}/${size}" ${selected ? '' : 'hidden'}>
					<figcaption><strong>${escape(group[0]!.label)} has the lowest observed time.</strong><br>Fastest library: ${escape(bestLibrary.label)}, ${formatTime(bestLibrary.meanMs)}. Native baselines remain in the comparison.</figcaption>
					<div class="bars" style="--rows:${group.length}" role="group" aria-label="${escape(scenario.title)}; ${size} records; ${shape}; fastest to slowest">${runtimeBars(group)}</div>
				</figure>`);
			}
		}
		const entries = results.bundles
			.filter((entry) => entry.scenario === scenario.id)
			.sort((a, b) => a.gzip - b.gzip);
		const largest = Math.max(...entries.map((entry) => entry.gzip));
		const native = entries.find(
			(entry) => entry.implementation === 'native',
		)!;
		bundles.push(`<figure data-bundle="${scenario.id}" ${scenario.id === SCENARIOS[0]!.id ? '' : 'hidden'}>
			<figcaption><strong>Bundle cost for the same workload.</strong><br>Complete working example, minified and gzipped. Smaller is better; native shows the no-library cost.</figcaption>
			<div class="bars bundle-bars" style="--rows:${entries.length}" role="group" aria-label="Gzip bytes, smallest to largest">${entries
				.map(
					(
						entry,
						rank,
					) => `<div class="row ${rank === 0 ? 'fastest' : ''}" style="${heatStyle(entry.gzip, entries[0]!.gzip, largest)}">
				<div class="name">${rank + 1}. ${escape(LABELS.find((item) => item.id === entry.implementation)!.label)}</div>
				<div class="track" aria-hidden="true"><i style="width:${(entry.gzip / largest) * 100}%"></i></div>
				<div class="value">${formatBytes(entry.gzip)}<small>${entry.gzip >= native.gzip ? '+' : ''}${formatBytes(entry.gzip - native.gzip)} vs native</small></div>
			</div>`,
				)
				.join('')}</div>
		</figure>`);
	}
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sorting benchmark comparison</title>
<style>
:root{color-scheme:light dark;font-family:var(--font-sans,"Segoe UI",sans-serif);color:var(--foreground,CanvasText);font-variant-numeric:tabular-nums}
html,body{margin:0;background:none}body{max-width:1100px;margin-inline:auto;padding:24px clamp(16px,4vw,40px)}h1{font-family:var(--font-mono,monospace);font-size:clamp(22px,4vw,32px);line-height:1.15;margin:12px 0}h2{font-size:18px;margin:30px 0 12px}p,figcaption{line-height:1.5}p{max-width:85ch;margin:12px 0}.muted,small{color:var(--muted-foreground,#626968)}.controls{display:flex;flex-wrap:wrap;gap:12px;padding-block:16px;border-block:1px solid var(--border,GrayText)}label{display:grid;min-width:0;gap:5px;font-size:13px}select{min-width:0;box-sizing:border-box;font:inherit;padding:8px;border:1px solid var(--border,GrayText);border-radius:var(--radius,4px);background:var(--card,Canvas);color:inherit;max-width:100%}select:focus-visible{outline:2px solid var(--ring,Highlight);outline-offset:2px}figure{margin:0}figcaption{margin-bottom:12px}.bars{display:flex;flex-direction:column;gap:0}.row{display:grid;grid-template-columns:minmax(125px,185px) minmax(45px,1fr) 145px;align-items:center;gap:12px;min-height:46px;border-bottom:1px solid var(--border,GrayText);font-size:13px}.name{overflow-wrap:anywhere}.track{position:relative;height:9px;border-left:1px solid var(--border,GrayText)}.track i{display:block;height:9px;background:hsl(var(--heat) 45% 38%)}.fastest{font-weight:700}.value{font-family:var(--font-mono,monospace);text-align:right;white-space:nowrap;background:hsl(var(--heat) 55% 92%);color:#182724;padding:7px 10px;border-radius:3px}.value small{color:inherit;opacity:.8}small{display:block;font-size:11px;font-weight:400;margin-top:3px}.note{font-size:12px}.footer{border-top:1px solid var(--border,GrayText);padding-block:16px;font-size:12px;overflow-wrap:anywhere}[hidden]{display:none!important}
.legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;margin:16px 0}.swatch{width:18px;height:12px;background:hsl(var(--heat) 55% 82%);border:1px solid hsl(var(--heat) 45% 38%);border-radius:2px}.legend .muted{margin-left:8px}details{margin-top:28px}summary{cursor:pointer;font-size:16px;font-weight:600;padding:12px 0}summary:focus-visible{outline:2px solid Highlight;outline-offset:4px}
@media(prefers-color-scheme:dark){.muted,small{color:var(--muted-foreground,#adb7b2)}.value{background:hsl(var(--heat) 30% 20%);color:#f0f5f3}.track i{background:hsl(var(--heat) 45% 62%)}}
pre.code{margin:0 0 10px;padding:12px 14px;border:1px solid var(--border,GrayText);border-radius:var(--radius,4px);background:var(--code-background,rgba(127,127,127,.12));overflow-x:auto;font:inherit;font-family:var(--font-mono,ui-monospace,monospace);font-size:12px;line-height:1.55;tab-size:2}
pre.code:last-child{margin-bottom:0}
code{font-family:var(--font-mono,ui-monospace,monospace);font-size:.94em}
@media(max-width:520px){.controls{display:grid;grid-template-columns:1fr 1fr}.controls label:first-child{grid-column:1/-1}.row{grid-template-columns:minmax(95px,1fr) minmax(30px,1fr) 120px;gap:8px;font-size:12px;min-height:49px}.value small{font-size:10px}}
</style></head><body>
<h1>Sorting performance, ranked</h1>
<p class="muted">${settings.quick ? 'Short profile' : 'Exhaustive profile'} · ${settings.rounds} rounds · ${escape(metadata.node)} · ${escape(metadata.cpu)}. Observed rankings, not statistically proven wins.</p>
<div class="controls">
<label>Workload<select id="scenario">${SCENARIOS.map((scenario) => `<option value="${scenario.id}">${escape(scenario.title)}</option>`).join('')}</select></label>
<label>Array size<select id="size">${settings.sizes.map((size) => `<option value="${size}" ${size === defaultSize ? 'selected' : ''}>${size.toLocaleString('en-US')} records</option>`).join('')}</select></label>
<label>Input order<select id="shape">${settings.shapes.map((shape) => `<option value="${shape}">${shape}</option>`).join('')}</select></label>
</div>
<p class="legend"><span class="swatch" style="--heat:165" aria-hidden="true"></span>Best<span class="swatch" style="--heat:95" aria-hidden="true"></span><span class="swatch" style="--heat:25" aria-hidden="true"></span>Worst<span class="muted">Colours compare values within each chart, not across workloads.</span></p>
<h2>Less time is better</h2>
<p class="note muted">One complete non-mutating sort. 1,000 µs = 1 ms. 1.00× is fastest; 2.00× takes twice as long. Bars start at zero; scales reset for each selection. † = over 20% round variation; small or noisy differences are not reliable wins.</p>
${runtime.join('\n')}
<h2>Smaller bundles are better</h2>
${bundles.join('\n')}
<details><summary>What is being sorted · code &amp; methodology</summary>
<p class="note muted">Order records: <code>{ id, status, createdAt, totalCents, customer: { lastName }, lines: [{ priceCents, quantity, discountPercent }] }</code>. Native baselines and every library produce byte-identical output, including tie order.</p>
${code.join('\n')}
</details>
<p class="footer muted">Measured ${escape(metadata.date)}. Raw JSON records the round means, sample counts and timing uncertainty. This chart uses the same medians as the Markdown report. Browser bundle size is measured, but browser execution and peak memory are not. Radashi’s built-in numeric sort and the Effect Array.sortWith variant are omitted from multi-key results. The es-toolkit core and cached compatibility APIs remain separate rows.</p>
<script>
const scenario = document.getElementById('scenario');
const size = document.getElementById('size');
const shape = document.getElementById('shape');
function update() {
 const key = scenario.value + '/' + shape.value + '/' + size.value;
 document.querySelectorAll('[data-runtime]').forEach(figure => { figure.hidden = figure.dataset.runtime !== key; });
 document.querySelectorAll('[data-bundle]').forEach(figure => { figure.hidden = figure.dataset.bundle !== scenario.value; });
 document.querySelectorAll('[data-code]').forEach(figure => { figure.hidden = figure.dataset.code !== scenario.value; });
}
[scenario,size,shape].forEach(select => select.addEventListener('change', update));
update();
</script></body></html>`;
}
