# Sorting benchmarks

[Interactive ranked charts](BENCHMARKS.html) · [Historical exhaustive run, before review fixes](benchmarks/full.md)

Measured sizes: **10, 100, 1,000, 10,000, 100,000** records · 2 rounds · shuffled input.

**Short profile:** lower sampling budgets. Use for iteration, not definitive performance claims.

## Fastest observed at a glance

For **shuffled** input. Each cell names the fastest observed entry and its time per complete sort. “Library” excludes the two native baselines. These are observations, not statistically proven winners.

| Workload / comparison | 10 | 100 | 1,000 | 10,000 | 100,000 |
| --- | --- | --- | --- | --- | --- |
| total · overall | Native handwritten — 0.278 µs | Native handwritten — 5.32 µs | Native cached keys — 116 µs | Native cached keys — 1.65 ms | ts-order compiled sort — 25.3 ms |
| total · library | ts-order compiled compare — 0.288 µs | ts-order compiled compare — 5.63 µs | Radashi sort — 120 µs | Radashi sort — 1.85 ms | ts-order compiled sort — 25.3 ms |
| fulfillment · overall | ts-order compiled compare — 0.318 µs | ts-order compiled compare — 5.92 µs | ts-order compiled compare — 155 µs | ts-order compiled sort — 2.46 ms | ts-order compiled sort — 38 ms |
| fulfillment · library | ts-order compiled compare — 0.318 µs | ts-order compiled compare — 5.92 µs | ts-order compiled compare — 155 µs | ts-order compiled sort — 2.46 ms | ts-order compiled sort — 38 ms |
| computed · overall | ts-order compiled sort — 0.52 µs | ts-order compiled sort — 8.23 µs | Native cached keys — 146 µs | Native cached keys — 2.24 ms | ts-order compiled sort — 53.7 ms |
| computed · library | ts-order compiled sort — 0.52 µs | ts-order compiled sort — 8.23 µs | ts-order compiled sort — 160 µs | ts-order compiled sort — 2.52 ms | ts-order compiled sort — 53.7 ms |

µs = microseconds; **1,000 µs = 1 ms**. Lower is better. **†** marks more than 20% variation between round means; treat that ranking with caution.

## Runtime results

The code behind every row is listed under [Sorting code](#sorting-code).

**Time · relative time.** 1.00× is the fastest observed in that column; larger ratios are slower. Rows are ranked by the largest measured array. Native baselines are included. Expand the variation table before interpreting close results.

### Stored order total, ascending

#### shuffled

| Implementation | 10 (µs) | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | 0.35 · 1.26× | 6.75 · 1.27× | 132 · 1.14× | 1.87 · 1.14× | **25.3 · 1.00×** |
| Native cached keys | 0.336 · 1.21× | 5.99 · 1.13× | **116 · 1.00×** | **1.65 · 1.00×** | 29.7 · 1.18×† |
| Native handwritten | **0.278 · 1.00×** | **5.32 · 1.00×** | 297 · 2.56×† | 1.82 · 1.11× | 39.1 · 1.55× |
| ts-order compiled compare | 0.288 · 1.03× | 5.63 · 1.06× | 123 · 1.06× | 1.92 · 1.16× | 40.9 · 1.62× |
| ts-order class | 0.58 · 2.08×† | 13.2 · 2.49× | 218 · 1.88× | 2.99 · 1.81× | 41.5 · 1.64× |
| Radashi sort | 0.307 · 1.10× | 5.97 · 1.12× | 120 · 1.04× | 1.85 · 1.12× | 45.4 · 1.80× |
| Effect Array.sortWith (cached) | 0.538 · 1.93× | 12.5 · 2.35× | 205 · 1.77× | 3.12 · 1.89× | 46.3 · 1.83× |
| Remeda | 0.448 · 1.61×† | 21.4 · 4.02×† | 222 · 1.92× | 3.38 · 2.05× | 62.1 · 2.45× |
| thenby | 0.437 · 1.57×† | 13.4 · 2.51× | 228 · 1.97× | 3.44 · 2.08× | 62.2 · 2.46× |
| es-toolkit compat (cached) | 0.764 · 2.74× | 15.6 · 2.94× | 246 · 2.13× | 3.83 · 2.33× | 62.7 · 2.48× |
| fast-sort | 0.576 · 2.07×† | 16.6 · 3.12× | 264 · 2.29× | 3.74 · 2.27× | 70 · 2.77× |
| Lodash (lodash-es) | 0.853 · 3.07×† | 17.7 · 3.33× | 273 · 2.36× | 4.01 · 2.44× | 76.3 · 3.02× |
| es-toolkit core | 0.552 · 1.98×† | 15.7 · 2.94× | 263 · 2.27× | 3.76 · 2.28× | 79.7 · 3.15× |
| ts-order comparator | 0.582 · 2.09×† | 22.3 · 4.19× | 358 · 3.09× | 4.5 · 2.73× | 84.7 · 3.35× |
| Effect Order | 0.7 · 2.51×† | 21.6 · 4.05× | 351 · 3.03× | 4.74 · 2.87× | 92.1 · 3.64× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 10 | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | ±3% | ±2% | ±1% | ±1% | ±1% |
| Native cached keys | ±5% | ±1% | ±0% | ±0% | ±22% |
| Native handwritten | ±2% | ±1% | ±63% | ±8% | ±2% |
| ts-order compiled compare | ±2% | ±7% | ±1% | ±2% | ±2% |
| ts-order class | ±25% | ±4% | ±0% | ±1% | ±2% |
| Radashi sort | ±4% | ±0% | ±0% | ±1% | ±9% |
| Effect Array.sortWith (cached) | ±19% | ±2% | ±0% | ±8% | ±11% |
| Remeda | ±36% | ±36% | ±0% | ±4% | ±2% |
| thenby | ±34% | ±4% | ±0% | ±7% | ±3% |
| es-toolkit compat (cached) | ±15% | ±4% | ±1% | ±7% | ±8% |
| fast-sort | ±39% | ±3% | ±3% | ±6% | ±1% |
| Lodash (lodash-es) | ±20% | ±0% | ±0% | ±0% | ±10% |
| es-toolkit core | ±30% | ±4% | ±1% | ±1% | ±3% |
| ts-order comparator | ±54% | ±19% | ±14% | ±4% | ±8% |
| Effect Order | ±39% | ±0% | ±3% | ±2% | ±1% |

</details>

### Fulfillment queue: status ↑, newest first, customer surname ↑

#### shuffled

| Implementation | 10 (µs) | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | 0.404 · 1.27× | 7.23 · 1.22× | 158 · 1.02× | **2.46 · 1.00×** | **38 · 1.00×** |
| Native cached keys | 0.392 · 1.23× | 7.47 · 1.26× | 167 · 1.07× | 2.59 · 1.06× | 44.6 · 1.17× |
| Native handwritten | 0.318 · 1.00× | 5.99 · 1.01× | 156 · 1.01× | 2.73 · 1.11× | 61.2 · 1.61× |
| ts-order compiled compare | **0.318 · 1.00×** | **5.92 · 1.00×** | **155 · 1.00×** | 2.85 · 1.16× | 67.9 · 1.79× |
| ts-order class | 1.04 · 3.28× | 19.1 · 3.23× | 325 · 2.09× | 4.89 · 1.99× | 101 · 2.65× |
| Lodash (lodash-es) | 1.32 · 4.15× | 22.5 · 3.79× | 366 · 2.36× | 5.78 · 2.35× | 106 · 2.78× |
| Remeda | 0.802 · 2.52× | 21.7 · 3.67× | 391 · 2.51× | 6.68 · 2.72× | 133 · 3.50× |
| ts-order comparator | 1.12 · 3.52× | 31.5 · 5.32× | 489 · 3.15× | 7.59 · 3.09× | 144 · 3.79× |
| es-toolkit core | 0.942 · 2.96× | 26.2 · 4.42× | 466 · 3.00× | 7.62 · 3.10× | 149 · 3.91× |
| es-toolkit compat (cached) | 1.9 · 5.97× | 28.2 · 4.77× | 417 · 2.69× | 6.61 · 2.69× | 171 · 4.50×† |
| Effect Order | 1.39 · 4.36× | 40.8 · 6.88× | 696 · 4.48× | 11 · 4.47× | 189 · 4.99× |
| fast-sort | 1.95 · 6.14× | 40.2 · 6.79× | 663 · 4.27× | 10.7 · 4.37× | 192 · 5.06× |
| thenby | 1.01 · 3.18× | 29.7 · 5.02× | 527 · 3.39× | 8.29 · 3.38× | 213 · 5.59× |
| Effect Array.sortWith (cached) | — | — | — | — | — |
| Radashi sort | — | — | — | — | — |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 10 | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | ±1% | ±3% | ±1% | ±1% | ±12% |
| Native cached keys | ±3% | ±5% | ±2% | ±6% | ±5% |
| Native handwritten | ±2% | ±3% | ±2% | ±1% | ±3% |
| ts-order compiled compare | ±4% | ±12% | ±1% | ±6% | ±4% |
| ts-order class | ±2% | ±1% | ±0% | ±1% | ±19% |
| Lodash (lodash-es) | ±3% | ±3% | ±1% | ±0% | ±1% |
| Remeda | ±9% | ±4% | ±0% | ±6% | ±6% |
| ts-order comparator | ±4% | ±13% | ±2% | ±6% | ±1% |
| es-toolkit core | ±1% | ±3% | ±1% | ±5% | ±5% |
| es-toolkit compat (cached) | ±2% | ±0% | ±1% | ±6% | ±28% |
| Effect Order | ±6% | ±7% | ±1% | ±6% | ±2% |
| fast-sort | ±4% | ±10% | ±1% | ±1% | ±2% |
| thenby | ±7% | ±3% | ±1% | ±3% | ±8% |

</details>

### Computed line-item total after discounts, descending

#### shuffled

| Implementation | 10 (µs) | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | **0.52 · 1.00×** | **8.23 · 1.00×** | 160 · 1.10× | 2.52 · 1.13× | **53.7 · 1.00×** |
| Native cached keys | 0.532 · 1.02× | 10 · 1.22×† | **146 · 1.00×** | **2.24 · 1.00×** | 55.5 · 1.03× |
| ts-order class | 0.875 · 1.68× | 15.4 · 1.87× | 255 · 1.75× | 3.53 · 1.58× | 62.9 · 1.17× |
| Effect Array.sortWith (cached) | 0.976 · 1.88× | 18.5 · 2.25× | 295 · 2.03× | 4.06 · 1.82× | 83.1 · 1.55× |
| es-toolkit compat (cached) | 1.05 · 2.01× | 18.3 · 2.23× | 280 · 1.92× | 4.34 · 1.94× | 86.5 · 1.61× |
| Lodash (lodash-es) | 1.14 · 2.19× | 19.2 · 2.33× | 301 · 2.06× | 4.75 · 2.12× | 93.1 · 1.73× |
| Native handwritten | 0.996 · 1.91× | 23.4 · 2.85× | 465 · 3.19× | 8.1 · 3.62× | 233 · 4.33× |
| Radashi sort | 0.993 · 1.91× | 21.9 · 2.67× | 467 · 3.21× | 8.85 · 3.96× | 251 · 4.66× |
| ts-order compiled compare | 0.995 · 1.91× | 21.9 · 2.67× | 474 · 3.25× | 8.41 · 3.76× | 251 · 4.67× |
| Remeda | 1.25 · 2.40× | 33.1 · 4.02× | 592 · 4.06× | 12.2 · 5.44× | 273 · 5.07× |
| es-toolkit core | 1.41 · 2.72× | 34 · 4.13× | 652 · 4.47× | 10.1 · 4.51× | 279 · 5.19× |
| Effect Order | 1.82 · 3.50× | 42.2 · 5.13× | 1,060 · 7.25×† | 12 · 5.37× | 290 · 5.39× |
| fast-sort | 1.42 · 2.73× | 46.8 · 5.68×† | 716 · 4.91× | 9.92 · 4.44× | 297 · 5.52× |
| ts-order comparator | 1.46 · 2.80× | 34.8 · 4.22× | 659 · 4.52× | 10.9 · 4.87× | 312 · 5.80× |
| thenby | 1.27 · 2.44× | 29.4 · 3.57× | 608 · 4.17× | 9.75 · 4.36× | 312 · 5.80× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 10 | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ts-order compiled sort | ±1% | ±0% | ±1% | ±3% | ±4% |
| Native cached keys | ±6% | ±29% | ±1% | ±10% | ±11% |
| ts-order class | ±3% | ±1% | ±3% | ±5% | ±4% |
| Effect Array.sortWith (cached) | ±1% | ±2% | ±1% | ±3% | ±9% |
| es-toolkit compat (cached) | ±4% | ±3% | ±3% | ±4% | ±12% |
| Lodash (lodash-es) | ±0% | ±1% | ±2% | ±6% | ±1% |
| Native handwritten | ±4% | ±8% | ±1% | ±9% | ±11% |
| Radashi sort | ±3% | ±4% | ±1% | ±15% | ±4% |
| ts-order compiled compare | ±3% | ±2% | ±3% | ±10% | ±6% |
| Remeda | ±5% | ±11% | ±1% | ±12% | ±12% |
| es-toolkit core | ±1% | ±3% | ±1% | ±4% | ±8% |
| Effect Order | ±8% | ±1% | ±28% | ±1% | ±6% |
| fast-sort | ±3% | ±31% | ±13% | ±5% | ±7% |
| ts-order comparator | ±5% | ±2% | ±1% | ±9% | ±3% |
| thenby | ±2% | ±1% | ±2% | ±6% | ±17% |

</details>

## Bundle overhead

Each result is a **complete working sorting example**, not an npm install size or the whole library. The same code used for timing is bundled individually for each workload. The native baseline contains the equivalent handwritten comparator. Each emitted bundle is executed and checked against the same reference before its size is accepted.

esbuild bundles for browser ESM / ES2022 with minification, tree shaking and legal comments removed; gzip uses level 9. No source maps, external packages, runtime polyfills, data fixtures or benchmark runner are included. ts-order resolves to its built public exports. Application glue and selector code are included; native rows show the no-library cost. Each example is written for its workload, with the selectors inline, as an application would write it. The code is listed under **Sorting code**.

Each workload is ranked by **gzip total**, smallest first. **Extra gzip** is the difference from the no-library handwritten example. B = bytes; KiB = 1,024 bytes. Deltas are example overhead, not context-independent library sizes: compression and shared application code are non-additive.

### Stored order total, ascending

| Implementation | Gzip total | Extra gzip vs native | Minified |
| --- | ---: | ---: | ---: |
| Native handwritten | 108 B | 0 B | 103 B |
| Native cached keys | 133 B | +25 B | 138 B |
| es-toolkit core | 326 B | +218 B | 491 B |
| Radashi sort | 332 B | +224 B | 570 B |
| Remeda | 340 B | +232 B | 567 B |
| ts-order comparator | 368 B | +260 B | 607 B |
| thenby | 390 B | +282 B | 695 B |
| Effect Order | 411 B | +303 B | 840 B |
| Effect Array.sortWith (cached) | 444 B | +336 B | 902 B |
| fast-sort | 770 B | +662 B | 1.61 KiB |
| ts-order class | 1005 B | +897 B | 2.26 KiB |
| es-toolkit compat (cached) | 1.27 KiB | +1.16 KiB | 2.72 KiB |
| ts-order compiled sort | 1.66 KiB | +1.55 KiB | 4.09 KiB |
| ts-order compiled compare | 1.66 KiB | +1.55 KiB | 4.09 KiB |
| Lodash (lodash-es) | 6.41 KiB | +6.30 KiB | 16.81 KiB |

### Fulfillment queue: status ↑, newest first, customer surname ↑

| Implementation | Gzip total | Extra gzip vs native | Minified |
| --- | ---: | ---: | ---: |
| Native handwritten | 151 B | 0 B | 210 B |
| Native cached keys | 181 B | +30 B | 273 B |
| es-toolkit core | 350 B | +199 B | 538 B |
| Remeda | 365 B | +214 B | 610 B |
| thenby | 416 B | +265 B | 752 B |
| ts-order comparator | 442 B | +291 B | 768 B |
| Effect Order | 505 B | +354 B | 1.04 KiB |
| fast-sort | 800 B | +649 B | 1.66 KiB |
| ts-order class | 1.01 KiB | +880 B | 2.32 KiB |
| es-toolkit compat (cached) | 1.29 KiB | +1.15 KiB | 2.76 KiB |
| ts-order compiled sort | 1.68 KiB | +1.53 KiB | 4.15 KiB |
| ts-order compiled compare | 1.68 KiB | +1.54 KiB | 4.15 KiB |
| Lodash (lodash-es) | 6.43 KiB | +6.29 KiB | 16.86 KiB |

### Computed line-item total after discounts, descending

| Implementation | Gzip total | Extra gzip vs native | Minified |
| --- | ---: | ---: | ---: |
| Native handwritten | 170 B | 0 B | 199 B |
| Native cached keys | 196 B | +26 B | 242 B |
| es-toolkit core | 386 B | +216 B | 590 B |
| Radashi sort | 400 B | +230 B | 675 B |
| Remeda | 407 B | +237 B | 674 B |
| ts-order comparator | 436 B | +266 B | 724 B |
| thenby | 459 B | +289 B | 800 B |
| Effect Order | 482 B | +312 B | 979 B |
| Effect Array.sortWith (cached) | 516 B | +346 B | 1.02 KiB |
| fast-sort | 833 B | +663 B | 1.70 KiB |
| ts-order class | 1.05 KiB | +903 B | 2.37 KiB |
| es-toolkit compat (cached) | 1.33 KiB | +1.16 KiB | 2.82 KiB |
| ts-order compiled sort | 1.73 KiB | +1.56 KiB | 4.20 KiB |
| ts-order compiled compare | 1.73 KiB | +1.57 KiB | 4.20 KiB |
| Lodash (lodash-es) | 6.47 KiB | +6.30 KiB | 16.91 KiB |

## Sorting code

The exact code that was timed and bundled, for every implementation and workload. Each module in `benchmarks/adapters/` exports one function per workload. That function runs once, before timing, to prepare any reusable definition. The function it returns is the one timed. Imports of the shared `Purchase` type, `Sorter` type and `computedTotal` helper from `benchmarks/cases.ts` are left out; `computedTotal` sums the discounted line items, rounding each line to cents.

### Stored order total, ascending

#### Native handwritten

```ts
export function total(): Sorter {
	return (purchases) =>
		purchases.toSorted((a, b) => a.totalCents - b.totalCents);
}
```

#### Native cached keys

```ts
export function total(): Sorter {
	return (purchases) =>
		purchases
			.map((value) => ({ value, key: value.totalCents }))
			.sort((a, b) => a.key - b.key)
			.map((entry) => entry.value);
}
```

#### ts-order class

```ts
import { Order } from 'ts-order';

export function total(): Sorter {
	const byTotal = new Order<Purchase>().by((purchase) => purchase.totalCents);
	return (purchases) => byTotal.sort(purchases);
}
```

#### ts-order comparator

```ts
import { by, order } from 'ts-order/comparator';

export function total(): Sorter {
	const compare = by((purchase: Purchase) => purchase.totalCents);
	return (purchases) => purchases.toSorted(compare);
}
```

#### ts-order compiled sort

```ts
import { compile, Order } from 'ts-order';

export function total(): Sorter {
	const byTotal = compile(
		new Order<Purchase>().by((purchase) => purchase.totalCents),
	);
	byTotal.sort([]); // generates the sort code once, before timing
	return (purchases) => byTotal.sort(purchases);
}
```

#### ts-order compiled compare

```ts
import { compile, Order } from 'ts-order';

export function total(): Sorter {
	const { compare } = compile(
		new Order<Purchase>().by((purchase) => purchase.totalCents),
	);
	return (purchases) => purchases.toSorted(compare);
}
```

#### Lodash (lodash-es)

```ts
import { orderBy } from 'lodash-es';

export function total(): Sorter {
	return (purchases) =>
		orderBy(
			purchases,
			[(purchase: Purchase) => purchase.totalCents],
			['asc'],
		);
}
```

#### es-toolkit core

```ts
import { orderBy } from 'es-toolkit/array';

export function total(): Sorter {
	return (purchases) =>
		orderBy(
			purchases,
			[(purchase: Purchase) => purchase.totalCents],
			['asc'],
		);
}
```

#### es-toolkit compat (cached)

```ts
import { orderBy } from 'es-toolkit/compat';

export function total(): Sorter {
	return (purchases) =>
		orderBy(
			purchases,
			[(purchase: Purchase) => purchase.totalCents],
			['asc'],
		);
}
```

#### fast-sort

```ts
import { sort } from 'fast-sort';

export function total(): Sorter {
	return (purchases) =>
		sort(purchases).asc((purchase) => purchase.totalCents);
}
```

#### Remeda

```ts
import { sortBy } from 'remeda';

export function total(): Sorter {
	return sortBy<readonly Purchase[]>((purchase) => purchase.totalCents);
}
```

#### thenby

```ts
import { firstBy } from 'thenby';

export function total(): Sorter {
	const compare = firstBy((purchase: Purchase) => purchase.totalCents);
	return (purchases) => purchases.toSorted(compare);
}
```

#### Effect Order

```ts
import * as Order from 'effect/Order';

export function total(): Sorter {
	const compare = Order.mapInput(
		Order.Number,
		(purchase: Purchase) => purchase.totalCents,
	);
	return (purchases) => purchases.toSorted(compare);
}
```

#### Effect Array.sortWith (cached)

```ts
import * as EffectArray from 'effect/Array';
import * as Order from 'effect/Order';

export function total(): Sorter {
	return EffectArray.sortWith<readonly Purchase[], number>(
		(purchase) => purchase.totalCents,
		Order.Number,
	);
}
```

#### Radashi sort

```ts
import { sort } from 'radashi';

export function total(): Sorter {
	return (purchases) => sort(purchases, (purchase) => purchase.totalCents);
}
```

### Fulfillment queue: status ↑, newest first, customer surname ↑

#### Native handwritten

```ts
export function fulfillment(): Sorter {
	return (purchases) =>
		purchases.toSorted(
			(a, b) =>
				a.status - b.status ||
				b.createdAt - a.createdAt ||
				(a.customer.lastName < b.customer.lastName
					? -1
					: a.customer.lastName > b.customer.lastName
						? 1
						: 0),
		);
}
```

#### Native cached keys

```ts
export function fulfillment(): Sorter {
	return (purchases) =>
		purchases
			.map((value) => ({
				value,
				status: value.status,
				createdAt: value.createdAt,
				lastName: value.customer.lastName,
			}))
			.sort(
				(a, b) =>
					a.status - b.status ||
					b.createdAt - a.createdAt ||
					(a.lastName < b.lastName
						? -1
						: a.lastName > b.lastName
							? 1
							: 0),
			)
			.map((entry) => entry.value);
}
```

#### ts-order class

```ts
import { Order } from 'ts-order';

export function fulfillment(): Sorter {
	const queue = new Order<Purchase>()
		.by((purchase) => purchase.status)
		.by((purchase) => purchase.createdAt, { direction: 'desc' })
		.by((purchase) => purchase.customer.lastName);
	return (purchases) => queue.sort(purchases);
}
```

#### ts-order comparator

```ts
import { by, order } from 'ts-order/comparator';

export function fulfillment(): Sorter {
	const compare = order(
		by((purchase: Purchase) => purchase.status),
		by((purchase: Purchase) => purchase.createdAt, { direction: 'desc' }),
		by((purchase: Purchase) => purchase.customer.lastName),
	);
	return (purchases) => purchases.toSorted(compare);
}
```

#### ts-order compiled sort

```ts
import { compile, Order } from 'ts-order';

export function fulfillment(): Sorter {
	const queue = compile(
		new Order<Purchase>()
			.by((purchase) => purchase.status)
			.by((purchase) => purchase.createdAt, { direction: 'desc' })
			.by((purchase) => purchase.customer.lastName),
	);
	queue.sort([]); // generates the sort code once, before timing
	return (purchases) => queue.sort(purchases);
}
```

#### ts-order compiled compare

```ts
import { compile, Order } from 'ts-order';

export function fulfillment(): Sorter {
	const { compare } = compile(
		new Order<Purchase>()
			.by((purchase) => purchase.status)
			.by((purchase) => purchase.createdAt, { direction: 'desc' })
			.by((purchase) => purchase.customer.lastName),
	);
	return (purchases) => purchases.toSorted(compare);
}
```

#### Lodash (lodash-es)

```ts
import { orderBy } from 'lodash-es';

export function fulfillment(): Sorter {
	return (purchases) =>
		orderBy(
			purchases,
			[
				(purchase: Purchase) => purchase.status,
				(purchase: Purchase) => purchase.createdAt,
				(purchase: Purchase) => purchase.customer.lastName,
			],
			['asc', 'desc', 'asc'],
		);
}
```

#### es-toolkit core

```ts
import { orderBy } from 'es-toolkit/array';

export function fulfillment(): Sorter {
	return (purchases) =>
		orderBy(
			purchases,
			[
				(purchase: Purchase) => purchase.status,
				(purchase: Purchase) => purchase.createdAt,
				(purchase: Purchase) => purchase.customer.lastName,
			],
			['asc', 'desc', 'asc'],
		);
}
```

#### es-toolkit compat (cached)

```ts
import { orderBy } from 'es-toolkit/compat';

export function fulfillment(): Sorter {
	return (purchases) =>
		orderBy(
			purchases,
			[
				(purchase: Purchase) => purchase.status,
				(purchase: Purchase) => purchase.createdAt,
				(purchase: Purchase) => purchase.customer.lastName,
			],
			['asc', 'desc', 'asc'],
		);
}
```

#### fast-sort

```ts
import { sort } from 'fast-sort';

export function fulfillment(): Sorter {
	return (purchases) =>
		sort(purchases).by([
			{ asc: (purchase) => purchase.status },
			{ desc: (purchase) => purchase.createdAt },
			{ asc: (purchase) => purchase.customer.lastName },
		]);
}
```

#### Remeda

```ts
import { sortBy } from 'remeda';

export function fulfillment(): Sorter {
	return sortBy<readonly Purchase[]>(
		(purchase) => purchase.status,
		[(purchase) => purchase.createdAt, 'desc'],
		(purchase) => purchase.customer.lastName,
	);
}
```

#### thenby

```ts
import { firstBy } from 'thenby';

export function fulfillment(): Sorter {
	const compare = firstBy((purchase: Purchase) => purchase.status)
		.thenBy((purchase) => purchase.createdAt, 'desc')
		.thenBy((purchase) => purchase.customer.lastName);
	return (purchases) => purchases.toSorted(compare);
}
```

#### Effect Order

```ts
import * as Order from 'effect/Order';

export function fulfillment(): Sorter {
	const compare = Order.combineAll([
		Order.mapInput(Order.Number, (purchase: Purchase) => purchase.status),
		Order.flip(
			Order.mapInput(
				Order.Number,
				(purchase: Purchase) => purchase.createdAt,
			),
		),
		Order.mapInput(
			Order.String,
			(purchase: Purchase) => purchase.customer.lastName,
		),
	]);
	return (purchases) => purchases.toSorted(compare);
}
```

Not measured: Effect Array.sortWith (cached), Radashi sort. Their APIs take one numeric key.

### Computed line-item total after discounts, descending

#### Native handwritten

```ts
export function computed(): Sorter {
	return (purchases) =>
		purchases.toSorted((a, b) => computedTotal(b) - computedTotal(a));
}
```

#### Native cached keys

```ts
export function computed(): Sorter {
	return (purchases) =>
		purchases
			.map((value) => ({ value, key: computedTotal(value) }))
			.sort((a, b) => b.key - a.key)
			.map((entry) => entry.value);
}
```

#### ts-order class

```ts
import { Order } from 'ts-order';

export function computed(): Sorter {
	const byComputedTotal = new Order<Purchase>().by(computedTotal, {
		direction: 'desc',
	});
	return (purchases) => byComputedTotal.sort(purchases);
}
```

#### ts-order comparator

```ts
import { by, order } from 'ts-order/comparator';

export function computed(): Sorter {
	const compare = by(computedTotal, { direction: 'desc' });
	return (purchases) => purchases.toSorted(compare);
}
```

#### ts-order compiled sort

```ts
import { compile, Order } from 'ts-order';

export function computed(): Sorter {
	const byComputedTotal = compile(
		new Order<Purchase>().by(computedTotal, { direction: 'desc' }),
	);
	byComputedTotal.sort([]); // generates the sort code once, before timing
	return (purchases) => byComputedTotal.sort(purchases);
}
```

#### ts-order compiled compare

```ts
import { compile, Order } from 'ts-order';

export function computed(): Sorter {
	const { compare } = compile(
		new Order<Purchase>().by(computedTotal, { direction: 'desc' }),
	);
	return (purchases) => purchases.toSorted(compare);
}
```

#### Lodash (lodash-es)

```ts
import { orderBy } from 'lodash-es';

export function computed(): Sorter {
	return (purchases) => orderBy(purchases, [computedTotal], ['desc']);
}
```

#### es-toolkit core

```ts
import { orderBy } from 'es-toolkit/array';

export function computed(): Sorter {
	return (purchases) => orderBy(purchases, [computedTotal], ['desc']);
}
```

#### es-toolkit compat (cached)

```ts
import { orderBy } from 'es-toolkit/compat';

export function computed(): Sorter {
	return (purchases) => orderBy(purchases, [computedTotal], ['desc']);
}
```

#### fast-sort

```ts
import { sort } from 'fast-sort';

export function computed(): Sorter {
	return (purchases) => sort(purchases).desc(computedTotal);
}
```

#### Remeda

```ts
import { sortBy } from 'remeda';

export function computed(): Sorter {
	return sortBy<readonly Purchase[]>([computedTotal, 'desc']);
}
```

#### thenby

```ts
import { firstBy } from 'thenby';

export function computed(): Sorter {
	const compare = firstBy(computedTotal, 'desc');
	return (purchases) => purchases.toSorted(compare);
}
```

#### Effect Order

```ts
import * as Order from 'effect/Order';

export function computed(): Sorter {
	const compare = Order.flip(Order.mapInput(Order.Number, computedTotal));
	return (purchases) => purchases.toSorted(compare);
}
```

#### Effect Array.sortWith (cached)

```ts
import * as EffectArray from 'effect/Array';
import * as Order from 'effect/Order';

export function computed(): Sorter {
	return EffectArray.sortWith<readonly Purchase[], number>(
		computedTotal,
		Order.flip(Order.Number),
	);
}
```

#### Radashi sort

```ts
import { sort } from 'radashi';

export function computed(): Sorter {
	return (purchases) => sort(purchases, computedTotal, 'desc');
}
```

<details>
<summary>Methodology, reproduction commands and environment</summary>

## Reproduce

```sh
bun install --frozen-lockfile
bun run bench:check    # types, fixtures, adapter correctness and bundle smoke tests
bun run bench          # short profile; writes BENCHMARKS.md, BENCHMARKS.html and benchmarks/results.json
bun run bench:full     # exhaustive profile; writes benchmarks/full.md, full.html and full.json
bun run bench:sizes    # bundle-only measurements; writes benchmarks/sizes.json
```

Bun installs dependencies and launches scripts; timings run on **Node through tsx**, not Bun. Close busy applications and repeat measurements in fresh processes. Commit the lockfile, source and generated results together. Both profiles include 10, 100, 1,000, 10,000 and 100,000 records. The short profile uses shuffled input, two rounds, 50 ms measurement and 20 ms warmup budgets with at least three samples. The 100,000-record cases dominate its runtime; expect roughly one to two minutes on a laptop, depending on hardware. The exhaustive profile adds all four input shapes with larger sampling budgets; it can take 10–15 minutes on a laptop. There are no timing thresholds in CI.

## Workloads and inputs

An e-commerce order dashboard is the shared use case. Each record has a customer, fulfillment status, creation timestamp, stored total and 1–12 line items. Money is integer cents; each line applies its percentage discount and rounds to cents before totals are summed.

- **Stored total:** one inexpensive numeric key, ascending. Represents clicking a numeric table column.
- **Fulfillment queue:** status rank ascending, creation timestamp descending, then nested customer surname ascending. Five statuses, 180 dates and ten surnames deliberately exercise secondary keys and ties.
- **Computed total:** sum discounted line-item totals on demand, descending. Represents sorting derived values not already indexed or stored. Unlike a synthetic busy loop, this does useful work; an application that already caches this total should use the stored-total results instead.

Arrays of **10, 100, 1,000, 10,000 and 100,000** records span a tiny dropdown/list, a small loaded table, a large table, client-side filtering, and a bulk export/offline workload. This measures sorting the entire loaded array, not server-side pagination or rendering.

The exhaustive profile runs each workload with shuffled, already sorted, reversed and nearly sorted inputs; the short profile uses shuffled input only. Nearly sorted inputs start sorted, then swap 1% of record pairs (up to roughly 2% of positions). Seeded generation and Fisher–Yates shuffling are reproducible. Each round uses a different seed, shared by every implementation. About 5% of records duplicate all sort fields of their predecessor, ensuring stability is tested in the generated arrays of at least 100 records. Separate hand-built fixtures test ties for tiny inputs too. Equal-key results preserve the current input order; no artificial ID tie-breaker is added.

## Fairness and scope

- Every implementation returns a new array and preserves the original records. Copying, key extraction, temporary allocations and ordinary garbage collection are included in timings. Dataset generation, reference sorting, validation, imports and report generation are excluded.
- Implementations that sort through a comparator use the modern non-mutating `Array.prototype.toSorted()`, including the native baseline, so the copy is measured the same way for each of them.
- The handwritten native baseline short-circuits directly on the workload fields. A separate native decorate–sort–undecorate baseline computes keys once per item into a flat object with one field per key. This distinguishes library overhead from the benefits and costs of caching.
- Orders, comparator chains, selectors and rule arrays are prepared once outside timing for **every** implementation that supports reuse. Per-call work imposed by a library API remains timed. This measures repeated sorting with a reused definition, not one-shot construction or module startup.
- ts-order class means `Order.sort()` (cached keys); compiled sort means `compile(order).sort()` with the same keys. The compiled compare row uses `compile(order).compare`. Code generation is completed outside timing. These are steady-state measurements, not compile-time or break-even measurements. ts-order comparator means `by()` directly for one key, or `order()` for multiple keys. They import separate public entry points. ts-order uses the local production build, not the previously published npm version. The runner requires Node with `new Function` available and stops if code generation is blocked. The library itself falls back to normal ordering in such environments; these compiled timings do not predict that fallback’s performance.
- Lodash uses the tree-shakable `lodash-es` ESM distribution, rather than charging for the entire CommonJS library. es-toolkit core and compatibility `orderBy` are separate rows; the compatibility variant caches extracted keys. Effect Order uses its public primitive orders and mapped/composed comparators. A separate Effect `Array.sortWith` variant caches single numeric keys. Neither Effect entry needs an Effect runtime. Existing core/comparator rows are retained rather than silently switching algorithms by workload.
- Radashi uses its built-in numeric `sort` only for the two single-key workloads. The cached Effect variant is also restricted to one numeric key in this suite. Unsupported multi-key cells are **—**, not custom wrappers presented as built-in features. Natural sorting, locale collation, missing keys, heterogeneous values, conditional rules and invalid numbers are outside this comparison; they have different semantics across libraries. [benchmarks/complex.md](benchmarks/complex.md) compares ts-order with native comparators on those.
- Correctness checks compare every output object against an independent handwritten reference, including exact tie order, before timing and after each warmup/measurement phase. Tests additionally freeze nested data and cover empty, singleton, tied, negative and zero-valued keys.

## Measurement method

Each cell is the **median of 2 round means**, per complete sort. A column uses **µs** if its fastest entry is below 1 ms, otherwise **ms**; all entries within that column use the same unit. Each cell also shows its time divided by the fastest entry’s time: **1.00×** is fastest, **2.00×** takes twice as long. Bold marks the lowest observed time, not a proven statistical win. A † flags over 20% round-to-round variation. Exact variation percentages are in the collapsed tables; they are **not confidence intervals**. Raw JSON also records each round’s sample count, mean, median, p99 and Tinybench relative margin of error.

Tinybench runs synchronously and sequentially: at least 50 ms and 3 samples per implementation per cell, preceded by at least 20 ms and three warmup iterations. Implementation order is deterministically shuffled for each group and round. Seeds start at 20261119. No outliers are removed; no forced garbage collection runs between samples.

With only two rounds, the displayed center averages the two round means; the deviation is just their half-range, not a robust uncertainty estimate. Round variation includes dataset differences, JIT state, allocation pressure and machine noise. Rounds share one process: these numbers do not estimate process-to-process uncertainty. Small differences and noisy cells should not be treated as wins. There is intentionally no aggregate score that weights unrelated workloads or hides unfavorable sizes.

## Environment

- Measured: 2026-11-20T05:41:04.996Z
- Node: v24.22.3; V8: 13.6.233.17-node.63
- System: darwin 24.5.0 arm64; CPU: Apple M1 Pro; RAM: 16 GiB
- Base commit: `533ee99441631ce25396ef69b4f02147bc4fc608`; working tree dirty: **true**
- Benchmark source SHA-256: `bdfd0a2544a1f6501922710aa626401bfacdcda56d52935092914ce356985720` (library and benchmark TypeScript, package.json and bun.lock; generated reports excluded)

| Package | Version |
| --- | --- |
| ts-order | 0.0.6 |
| lodash-es | 4.18.1 |
| es-toolkit | 1.53.2 |
| fast-sort | 3.4.1 |
| remeda | 2.62.2 |
| thenby | 1.4.1 |
| effect | 4.1.4 |
| radashi | 13.1.0 |
| tinybench | 6.2.4 |
| esbuild | 0.28.2 |
| tsx | 4.23.15 |

The source hash records the tree at measurement time, not later report-template or CLI-profile edits. Re-rendering a saved result does not rerun its timings.


</details>


## Limits

These are deterministic synthetic orders with realistic operations, not a production trace. One machine and one Node/V8 version cannot establish browser, Bun, other Node-version or universal performance. The suite does not measure peak memory, cold imports, comparator construction, server/database sorting, or bundle reuse inside an existing application. Choose based on the workload and semantics you need; repeat measurements on your target runtime.
