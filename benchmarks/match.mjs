// Compares `match` with the same groups written as `when()` chains: `bun run build && node benchmarks/match.mjs [rounds]`.
/* oxlint-disable typescript/no-unsafe-argument, no-console -- plain JS over the built package */
import { Order, compile } from '../dist/index.js';
import { match } from '../dist/match.js';

const N = 10_000,
	ROUNDS = Number(process.argv[2] ?? 41);
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const kinds = ['square', 'circle', 'triangle'];
const items = Array.from({ length: N }, (_, id) => {
	const kind = kinds[Math.floor(rand() * 3)],
		v = Math.floor(rand() * 100);
	return kind === 'square'
		? { kind, id, side: v }
		: kind === 'circle'
			? { kind, id, radius: v }
			: { kind, id, base: v };
});

const viaMatch = (m) =>
	m()
		.with({ kind: 'square' }, (o) =>
			o.by((s) => s.side, { direction: 'desc' }),
		)
		.with({ kind: 'circle' }, (o) => o.by((c) => c.radius))
		.with({ kind: 'triangle' }, (o) => o)
		.exhaustive()
		.by((s) => s.id);
const RANK = { square: 0, circle: 1, triangle: 2 };
const orders = {
	match: viaMatch(match),
	'Order when() chain': new Order()
		.when(
			(s) => s.kind === 'square',
			Order.by((s) => s.side, { direction: 'desc' }),
		)
		.when(
			(s) => s.kind === 'circle',
			Order.by((s) => s.radius),
		)
		.when((s) => s.kind === 'triangle', new Order())
		.by((s) => s.id),
	'Order rank key + when()': Order.by((s) => RANK[s.kind])
		.when(
			(s) => s.kind === 'square',
			Order.by((s) => s.side, { direction: 'desc' }),
		)
		.when(
			(s) => s.kind === 'circle',
			Order.by((s) => s.radius),
		)
		.by((s) => s.id),
};
const cases = {};
for (const [name, o] of Object.entries(orders)) {
	const c = compile(o);
	cases[name + '|sort()'] = (a) => o.sort(a);
	cases[name + '|compare'] = (a) => a.slice().sort(o.compare);
	cases[name + '|compile sort()'] = (a) => c.sort(a);
	cases[name + '|compile compare'] = (a) => a.slice().sort(c.compare);
}
const ref = JSON.stringify(
	orders['Order when() chain'].sort(items).map((s) => s.id),
);
for (const [name, f] of Object.entries(cases))
	if (JSON.stringify(f(items).map((s) => s.id)) !== ref)
		throw new Error('mismatch: ' + name);

const times = Object.fromEntries(Object.keys(cases).map((k) => [k, []]));
for (let r = 0; r < ROUNDS; r++) {
	const names = Object.keys(cases);
	if (r % 2) names.reverse();
	for (const name of names) {
		const input = items.slice(),
			t = performance.now();
		cases[name](input);
		times[name].push(performance.now() - t);
	}
}
const median = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
const modes = ['sort()', 'compare', 'compile sort()', 'compile compare'];
console.log(['order', ...modes].join('\t'));
for (const name of Object.keys(orders))
	console.log(
		[
			name,
			...modes.map((m) => median(times[name + '|' + m]).toFixed(2)),
		].join('\t'),
	);
