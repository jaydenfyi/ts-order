# Sorting benchmarks

**Historical, pre-review results.** This run predates the 10-record case, the cached Effect/es-toolkit variants, the single-key wrapper fixes, and the experimental compiled ts-order entries. Its data is preserved unchanged. Use [the current comparison](../BENCHMARKS.md) for the reviewed implementations.

[Interactive ranked charts](full.html) · Exhaustive profile

Measured sizes: **100, 1,000, 10,000, 100,000** records · 3 rounds · shuffled, sorted, reversed, nearly-sorted input.

## Fastest observed at a glance

For **shuffled** input. Each cell names the fastest observed entry and its time per complete sort. “Library” excludes the two native baselines. These are observations, not statistically proven winners.

| Workload / comparison | 100 | 1,000 | 10,000 | 100,000 |
| --- | --- | --- | --- | --- |
| total · overall | Radashi sort — 7.16 µs | Native handwritten — 149 µs† | Radashi sort — 2.18 ms | Native handwritten — 45 ms |
| total · library | Radashi sort — 7.16 µs | Radashi sort — 152 µs | Radashi sort — 2.18 ms | Radashi sort — 48 ms |
| fulfillment · overall | Native handwritten — 8.03 µs | Native handwritten — 210 µs | Native handwritten — 3.52 ms† | Native handwritten — 75.1 ms |
| fulfillment · library | ts-order class — 24.5 µs | ts-order class — 441 µs† | ts-order class — 6.41 ms | ts-order class — 93 ms |
| computed · overall | Native cached keys — 18.4 µs | Native cached keys — 315 µs | Native cached keys — 4.94 ms | ts-order class — 77.3 ms |
| computed · library | ts-order class — 19.4 µs | ts-order class — 318 µs | ts-order class — 5.01 ms | ts-order class — 77.3 ms |

µs = microseconds; **1,000 µs = 1 ms**. Lower is better. **†** marks more than 20% variation between round means; treat that ranking with caution.

## Runtime results

**Time · relative time.** 1.00× is the fastest observed in that column; larger ratios are slower. Rows are ranked by the largest measured array. Native baselines are included. Expand the variation table before interpreting close results.

### Stored order total, ascending

#### shuffled

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | 7.35 · 1.03× | **149 · 1.00×†** | 2.24 · 1.03×† | **45 · 1.00×** |
| Radashi sort | **7.16 · 1.00×** | 152 · 1.02× | **2.18 · 1.00×** | 48 · 1.07× |
| ts-order class | 17.6 · 2.46×† | 281 · 1.89× | 3.81 · 1.75× | 50.9 · 1.13× |
| Native cached keys | 16.3 · 2.28×† | 268 · 1.80× | 3.96 · 1.82× | 71 · 1.58× |
| thenby | 18 · 2.51×† | 297 · 1.99× | 4.17 · 1.91× | 75.1 · 1.67× |
| Remeda | 18.1 · 2.53×† | 293 · 1.97× | 4.04 · 1.86× | 77.6 · 1.72× |
| Lodash (lodash-es) | 22.7 · 3.17×† | 351 · 2.36× | 4.87 · 2.24× | 81.4 · 1.81× |
| fast-sort | 21.9 · 3.06×† | 353 · 2.37×† | 4.9 · 2.25×† | 84.8 · 1.88× |
| es-toolkit | 21 · 2.94×† | 346 · 2.33× | 4.79 · 2.20× | 88.3 · 1.96× |
| ts-order comparator | 26.6 · 3.71×† | 413 · 2.78× | 5.84 · 2.68×† | 103 · 2.28× |
| Effect Order | 35.6 · 4.97×† | 562 · 3.78× | 8.93 · 4.10× | 133 · 2.96× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | ±6% | ±125% | ±182% | ±8% |
| Radashi sort | ±3% | ±3% | ±8% | ±14% |
| ts-order class | ±27% | ±3% | ±3% | ±3% |
| Native cached keys | ±28% | ±19% | ±11% | ±4% |
| thenby | ±59% | ±3% | ±17% | ±3% |
| Remeda | ±58% | ±9% | ±18% | ±10% |
| Lodash (lodash-es) | ±31% | ±2% | ±3% | ±3% |
| fast-sort | ±61% | ±48% | ±26% | ±9% |
| es-toolkit | ±52% | ±5% | ±12% | ±8% |
| ts-order comparator | ±70% | ±2% | ±24% | ±12% |
| Effect Order | ±58% | ±3% | ±12% | ±4% |

</details>

#### sorted

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (µs) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | **1.46 · 1.00×** | **14 · 1.00×** | **143 · 1.00×** | **4.04 · 1.00×†** |
| Radashi sort | 1.52 · 1.05× | 14.5 · 1.04× | 149 · 1.04× | 4.53 · 1.12× |
| ts-order class | 4.11 · 2.82×† | 40.9 · 2.93× | 420 · 2.94× | 8.27 · 2.05× |
| Remeda | 2.55 · 1.75×† | 25.6 · 1.83× | 287 · 2.01×† | 8.7 · 2.16×† |
| thenby | 3.07 · 2.11×† | 31.1 · 2.22× | 335 · 2.35×† | 9.04 · 2.24×† |
| fast-sort | 4.16 · 2.86×† | 40.1 · 2.87× | 409 · 2.86× | 9.61 · 2.38×† |
| ts-order comparator | 4.71 · 3.23×† | 46.9 · 3.35×† | 506 · 3.55×† | 10.6 · 2.62×† |
| es-toolkit | 3.67 · 2.52×† | 36.4 · 2.60×† | 402 · 2.81× | 13.5 · 3.33× |
| Native cached keys | 5.07 · 3.48×† | 50.8 · 3.63× | 617 · 4.32× | 14 · 3.48×† |
| Lodash (lodash-es) | 6.01 · 4.13×† | 58.8 · 4.20× | 705 · 4.94× | 14.3 · 3.56× |
| Effect Order | 5.97 · 4.10×† | 60.6 · 4.34× | 650 · 4.55×† | 14.9 · 3.70×† |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | ±1% | ±9% | ±1% | ±23% |
| Radashi sort | ±6% | ±17% | ±5% | ±11% |
| ts-order class | ±35% | ±5% | ±2% | ±13% |
| Remeda | ±38% | ±2% | ±72% | ±25% |
| thenby | ±46% | ±8% | ±56% | ±26% |
| fast-sort | ±60% | ±6% | ±8% | ±33% |
| ts-order comparator | ±55% | ±26932% | ±41% | ±23% |
| es-toolkit | ±44% | ±235% | ±4% | ±19% |
| Native cached keys | ±33% | ±5% | ±11% | ±51% |
| Lodash (lodash-es) | ±29% | ±4% | ±6% | ±13% |
| Effect Order | ±39% | ±1% | ±37% | ±24% |

</details>

#### reversed

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (µs) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Radashi sort | **7.24 · 1.00×†** | 87.8 · 1.00×† | 855 · 1.02× | **18.6 · 1.00×** |
| Native handwritten | 7.43 · 1.03×† | **87.8 · 1.00×†** | **835 · 1.00×** | 19.7 · 1.06× |
| ts-order class | 11 · 1.51×† | 154 · 1.75×† | 1,490 · 1.78× | 20.5 · 1.10× |
| thenby | 9.83 · 1.36×† | 153 · 1.74×† | 1,860 · 2.23×† | 27 · 1.45× |
| Native cached keys | 10.7 · 1.48×† | 153 · 1.74×† | 1,630 · 1.95× | 28.6 · 1.53× |
| Remeda | 11 · 1.52×† | 168 · 1.92×† | 1,660 · 1.98×† | 28.7 · 1.54× |
| fast-sort | 12.6 · 1.74×† | 194 · 2.21×† | 1,850 · 2.21× | 30.3 · 1.62× |
| es-toolkit | 11.7 · 1.62×† | 179 · 2.04×† | 1,770 · 2.12× | 30.8 · 1.65× |
| Lodash (lodash-es) | 15.4 · 2.13×† | 217 · 2.47×† | 2,190 · 2.62× | 30.8 · 1.65× |
| ts-order comparator | 15.1 · 2.08×† | 229 · 2.61× | 2,280 · 2.72×† | 32 · 1.71× |
| Effect Order | 20.8 · 2.87×† | 310 · 3.53×† | 3,150 · 3.77×† | 49.1 · 2.63× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Radashi sort | ±24% | ±26% | ±3% | ±12% |
| Native handwritten | ±27% | ±909% | ±3% | ±17% |
| ts-order class | ±25% | ±100% | ±2% | ±11% |
| thenby | ±35% | ±1139% | ±31% | ±8% |
| Native cached keys | ±27% | ±118% | ±8% | ±19% |
| Remeda | ±36% | ±176% | ±49% | ±13% |
| fast-sort | ±35% | ±27% | ±1% | ±13% |
| es-toolkit | ±36% | ±381% | ±2% | ±7% |
| Lodash (lodash-es) | ±29% | ±453% | ±3% | ±2% |
| ts-order comparator | ±36% | ±4% | ±38% | ±10% |
| Effect Order | ±37% | ±91% | ±27% | ±12% |

</details>

#### nearly-sorted

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (µs) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Radashi sort | 2.33 · 1.06× | 34.4 · 1.02× | 426 · 1.06× | **9.86 · 1.00×** |
| Native handwritten | **2.2 · 1.00×** | **33.6 · 1.00×** | **402 · 1.00×** | 10.1 · 1.02×† |
| ts-order class | 5.98 · 2.71×† | 90.3 · 2.69× | 875 · 2.18× | 14.4 · 1.46× |
| Remeda | 4.39 · 1.99×† | 70.5 · 2.10× | 762 · 1.90×† | 15.5 · 1.57× |
| fast-sort | 7.03 · 3.19×† | 104 · 3.11×† | 1,040 · 2.60× | 18.4 · 1.87× |
| thenby | 5.28 · 2.40×† | 89.6 · 2.67×† | 884 · 2.20×† | 20.1 · 2.03×† |
| es-toolkit | 6.29 · 2.85×† | 95.7 · 2.85× | 985 · 2.45× | 21.3 · 2.16× |
| Native cached keys | 6.7 · 3.04×† | 91.8 · 2.73× | 1,090 · 2.72× | 22.5 · 2.29× |
| ts-order comparator | 8.34 · 3.79×† | 149 · 4.44×† | 1,280 · 3.17×† | 22.8 · 2.31× |
| Lodash (lodash-es) | 8.27 · 3.75×† | 111 · 3.32× | 1,290 · 3.21× | 24.3 · 2.46× |
| Effect Order | 10.8 · 4.88×† | 174 · 5.19×† | 1,620 · 4.02×† | 28.8 · 2.92× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Radashi sort | ±1% | ±12% | ±3% | ±13% |
| Native handwritten | ±5% | ±4% | ±1% | ±73% |
| ts-order class | ±32% | ±7% | ±4% | ±11% |
| Remeda | ±45% | ±1% | ±51% | ±16% |
| fast-sort | ±63% | ±615% | ±3% | ±15% |
| thenby | ±51% | ±101% | ±38% | ±20% |
| es-toolkit | ±48% | ±4% | ±3% | ±12% |
| Native cached keys | ±34% | ±14% | ±13% | ±14% |
| ts-order comparator | ±61% | ±49% | ±31% | ±12% |
| Lodash (lodash-es) | ±30% | ±4% | ±15% | ±19% |
| Effect Order | ±43% | ±58% | ±25% | ±5% |

</details>

### Fulfillment queue: status ↑, newest first, customer surname ↑

#### shuffled

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | **8.03 · 1.00×** | **210 · 1.00×** | **3.52 · 1.00×†** | **75.1 · 1.00×** |
| ts-order class | 24.5 · 3.05× | 441 · 2.10×† | 6.41 · 1.82× | 93 · 1.24× |
| Lodash (lodash-es) | 29.3 · 3.65× | 468 · 2.23× | 7.24 · 2.05× | 127 · 1.70× |
| Native cached keys | 31.7 · 3.95× | 489 · 2.33× | 7.57 · 2.15× | 142 · 1.89× |
| Remeda | 27.9 · 3.47× | 509 · 2.42× | 8.96 · 2.54×† | 152 · 2.03× |
| ts-order comparator | 36.8 · 4.58× | 635 · 3.02× | 10.3 · 2.92× | 175 · 2.33× |
| es-toolkit | 33.2 · 4.14× | 611 · 2.91×† | 9.55 · 2.71× | 179 · 2.38× |
| thenby | 39.3 · 4.89×† | 725 · 3.45× | 11.7 · 3.32× | 200 · 2.66× |
| fast-sort | 47.2 · 5.87× | 850 · 4.05× | 13.6 · 3.86× | 228 · 3.04× |
| Effect Order | 51 · 6.35×† | 892 · 4.25× | 14.3 · 4.07× | 229 · 3.05× |
| Radashi sort | — | — | — | — |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | ±4% | ±8% | ±27% | ±10% |
| ts-order class | ±2% | ±42% | ±2% | ±8% |
| Lodash (lodash-es) | ±3% | ±0% | ±2% | ±7% |
| Native cached keys | ±0% | ±2% | ±7% | ±15% |
| Remeda | ±1% | ±1% | ±24% | ±5% |
| ts-order comparator | ±2% | ±2% | ±4% | ±7% |
| es-toolkit | ±2% | ±88% | ±2% | ±6% |
| thenby | ±22% | ±2% | ±3% | ±8% |
| fast-sort | ±2% | ±4% | ±1% | ±4% |
| Effect Order | ±24% | ±1% | ±19% | ±4% |

</details>

#### sorted

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (µs) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | **1.9 · 1.00×†** | **30.1 · 1.00×†** | **358 · 1.00×** | **6.99 · 1.00×** |
| Remeda | 6.15 · 3.24× | 78.1 · 2.59× | 1,030 · 2.89×† | 20.4 · 2.92× |
| ts-order comparator | 7.62 · 4.02× | 90.9 · 3.02× | 1,190 · 3.32× | 20.5 · 2.94× |
| ts-order class | 7.75 · 4.08× | 96.6 · 3.20×† | 1,060 · 2.97× | 21.5 · 3.07× |
| es-toolkit | 7.42 · 3.91× | 92.4 · 3.06× | 1,160 · 3.25× | 23.1 · 3.30× |
| thenby | 8.28 · 4.36× | 105 · 3.47×† | 1,300 · 3.64× | 23.6 · 3.37× |
| Lodash (lodash-es) | 9.41 · 4.96× | 110 · 3.66×† | 1,200 · 3.35×† | 25.9 · 3.70× |
| fast-sort | 10.5 · 5.52× | 132 · 4.39× | 1,730 · 4.84× | 25.9 · 3.71×† |
| Effect Order | 10.6 · 5.59× | 126 · 4.18× | 1,520 · 4.26× | 27.5 · 3.94× |
| Native cached keys | 17.2 · 9.05× | 187 · 6.20× | 2,240 · 6.27× | 43.6 · 6.24× |
| Radashi sort | — | — | — | — |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | ±24% | ±55% | ±3% | ±16% |
| Remeda | ±1% | ±3% | ±39% | ±10% |
| ts-order comparator | ±3% | ±1% | ±16% | ±14% |
| ts-order class | ±2% | ±24% | ±17% | ±15% |
| es-toolkit | ±1% | ±5% | ±6% | ±6% |
| thenby | ±3% | ±70% | ±7% | ±12% |
| Lodash (lodash-es) | ±1% | ±38% | ±52% | ±12% |
| fast-sort | ±11% | ±1% | ±9% | ±27% |
| Effect Order | ±1% | ±1% | ±9% | ±16% |
| Native cached keys | ±3% | ±3% | ±6% | ±14% |

</details>

#### reversed

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | **8.44 · 1.00×†** | **118 · 1.00×** | **1.42 · 1.00×** | **27.9 · 1.00×** |
| ts-order class | 20 · 2.37× | 273 · 2.32× | 3.24 · 2.28× | 46.4 · 1.66× |
| Lodash (lodash-es) | 22.9 · 2.71×† | 291 · 2.47× | 3.67 · 2.58× | 50.5 · 1.81× |
| ts-order comparator | 27.4 · 3.24×† | 407 · 3.45× | 4.54 · 3.19× | 59.6 · 2.14× |
| Remeda | 21.8 · 2.59×† | 326 · 2.77×† | 4.34 · 3.04× | 63.2 · 2.26×† |
| Native cached keys | 29.6 · 3.51× | 370 · 3.14×† | 4.25 · 2.98× | 65.8 · 2.36×† |
| es-toolkit | 25.2 · 2.98×† | 382 · 3.24× | 4.73 · 3.32× | 66.6 · 2.38×† |
| thenby | 32 · 3.80×† | 473 · 4.02× | 5.5 · 3.86× | 71.5 · 2.56×† |
| Effect Order | 40.3 · 4.78×† | 601 · 5.10× | 6.73 · 4.73× | 79.9 · 2.86× |
| fast-sort | 39.3 · 4.65×† | 592 · 5.02× | 7.2 · 5.05× | 91 · 3.26× |
| Radashi sort | — | — | — | — |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | ±32% | ±15% | ±13% | ±3% |
| ts-order class | ±19% | ±3% | ±4% | ±1% |
| Lodash (lodash-es) | ±21% | ±2% | ±4% | ±12% |
| ts-order comparator | ±25% | ±6% | ±4% | ±19% |
| Remeda | ±25% | ±24% | ±2% | ±26% |
| Native cached keys | ±6% | ±31% | ±6% | ±37% |
| es-toolkit | ±21% | ±2% | ±4% | ±27% |
| thenby | ±26% | ±0% | ±1% | ±26% |
| Effect Order | ±26% | ±6% | ±3% | ±16% |
| fast-sort | ±25% | ±2% | ±2% | ±1% |

</details>

#### nearly-sorted

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (µs) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | **2.82 · 1.00×** | **49.1 · 1.00×** | **773 · 1.00×** | **17 · 1.00×** |
| ts-order class | 10.3 · 3.65× | 155 · 3.16×† | 1,870 · 2.42× | 32.9 · 1.93× |
| Lodash (lodash-es) | 12.5 · 4.44× | 175 · 3.57× | 2,220 · 2.87×† | 34.8 · 2.04× |
| Remeda | 9.78 · 3.46× | 168 · 3.43×† | 2,010 · 2.61× | 36.8 · 2.16× |
| ts-order comparator | 12.7 · 4.50× | 212 · 4.32×† | 2,370 · 3.07× | 38 · 2.23× |
| es-toolkit | 12 · 4.23× | 211 · 4.30× | 2,440 · 3.15×† | 44.3 · 2.60× |
| thenby | 13.4 · 4.75× | 252 · 5.13× | 2,820 · 3.64× | 47 · 2.76×† |
| Effect Order | 17.7 · 6.27× | 291 · 5.93×† | 3,210 · 4.16× | 48.5 · 2.84× |
| fast-sort | 17 · 6.03× | 313 · 6.37× | 3,480 · 4.50× | 53.7 · 3.15× |
| Native cached keys | 19.1 · 6.78× | 246 · 5.01× | 3,100 · 4.01×† | 56.1 · 3.29× |
| Radashi sort | — | — | — | — |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Native handwritten | ±2% | ±2% | ±1% | ±20% |
| ts-order class | ±13% | ±58% | ±10% | ±17% |
| Lodash (lodash-es) | ±2% | ±2% | ±33% | ±3% |
| Remeda | ±4% | ±36% | ±1% | ±6% |
| ts-order comparator | ±3% | ±43% | ±5% | ±5% |
| es-toolkit | ±2% | ±4% | ±30% | ±4% |
| thenby | ±1% | ±15% | ±3% | ±35% |
| Effect Order | ±3% | ±99% | ±0% | ±18% |
| fast-sort | ±3% | ±8% | ±4% | ±5% |
| Native cached keys | ±1% | ±8% | ±75% | ±8% |

</details>

### Computed line-item total after discounts, descending

#### shuffled

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| ts-order class | 19.4 · 1.05× | 318 · 1.01× | 5.01 · 1.01× | **77.3 · 1.00×** |
| Native cached keys | **18.4 · 1.00×** | **315 · 1.00×** | **4.94 · 1.00×** | 97.9 · 1.27×† |
| Lodash (lodash-es) | 24.7 · 1.34× | 385 · 1.22× | 6.05 · 1.23×† | 105 · 1.36×† |
| Radashi sort | 27.1 · 1.47× | 608 · 1.93× | 10.7 · 2.17× | 236 · 3.05×† |
| Native handwritten | 27.3 · 1.48× | 599 · 1.90× | 10.5 · 2.12× | 244 · 3.16× |
| Remeda | 37.1 · 2.01× | 768 · 2.44× | 12.6 · 2.55× | 295 · 3.81× |
| es-toolkit | 41.5 · 2.25× | 821 · 2.61× | 13.7 · 2.78× | 300 · 3.88×† |
| fast-sort | 42.1 · 2.28× | 830 · 2.63× | 13.4 · 2.71× | 311 · 4.03× |
| thenby | 38 · 2.06× | 787 · 2.50×† | 13.3 · 2.69×† | 328 · 4.24× |
| ts-order comparator | 47.6 · 2.58× | 896 · 2.84× | 15.7 · 3.18× | 352 · 4.56× |
| Effect Order | 63.7 · 3.45× | 1,120 · 3.57× | 18.8 · 3.81× | 359 · 4.64× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| ts-order class | ±2% | ±2% | ±7% | ±4% |
| Native cached keys | ±2% | ±3% | ±1% | ±26% |
| Lodash (lodash-es) | ±1% | ±1% | ±22% | ±38% |
| Radashi sort | ±7% | ±1% | ±5% | ±21% |
| Native handwritten | ±3% | ±1% | ±3% | ±15% |
| Remeda | ±3% | ±11% | ±1% | ±12% |
| es-toolkit | ±3% | ±1% | ±6% | ±29% |
| fast-sort | ±2% | ±1% | ±13% | ±19% |
| thenby | ±2% | ±34% | ±36% | ±19% |
| ts-order comparator | ±4% | ±14% | ±13% | ±16% |
| Effect Order | ±4% | ±10% | ±9% | ±7% |

</details>

#### sorted

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (µs) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Radashi sort | **5.27 · 1.00×** | 67.6 · 1.00× | 970 · 1.08×† | **30.1 · 1.00×** |
| Remeda | 6.89 · 1.31× | 89.9 · 1.33×† | 1,350 · 1.51×† | 30.9 · 1.03× |
| Native handwritten | 5.28 · 1.00× | **67.3 · 1.00×** | **897 · 1.00×** | 32.5 · 1.08× |
| ts-order comparator | 8.91 · 1.69× | 108 · 1.60×† | 1,600 · 1.78× | 34.4 · 1.14×† |
| ts-order class | 5.85 · 1.11× | 76.5 · 1.14× | 1,220 · 1.36× | 34.8 · 1.16× |
| es-toolkit | 7.7 · 1.46× | 98 · 1.46× | 1,340 · 1.50×† | 35.3 · 1.18× |
| Effect Order | 11.6 · 2.20× | 128 · 1.90×† | 1,510 · 1.68× | 37.1 · 1.23× |
| thenby | 6.77 · 1.28× | 89.4 · 1.33×† | 1,370 · 1.53×† | 38.4 · 1.28×† |
| Native cached keys | 6.85 · 1.30× | 88.4 · 1.31× | 1,470 · 1.64×† | 38.6 · 1.28×† |
| fast-sort | 7.6 · 1.44× | 95.6 · 1.42× | 1,170 · 1.30×† | 39.8 · 1.32× |
| Lodash (lodash-es) | 8.47 · 1.61× | 101 · 1.50× | 1,470 · 1.64×† | 41.8 · 1.39× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| Radashi sort | ±5% | ±5% | ±51% | ±14% |
| Remeda | ±3% | ±32% | ±29% | ±19% |
| Native handwritten | ±6% | ±5% | ±18% | ±11% |
| ts-order comparator | ±1% | ±26% | ±16% | ±26% |
| ts-order class | ±10% | ±4% | ±15% | ±14% |
| es-toolkit | ±2% | ±5% | ±45% | ±13% |
| Effect Order | ±2% | ±32% | ±20% | ±10% |
| thenby | ±3% | ±31% | ±29% | ±20% |
| Native cached keys | ±5% | ±1% | ±48% | ±29% |
| fast-sort | ±2% | ±4% | ±32% | ±19% |
| Lodash (lodash-es) | ±2% | ±5% | ±31% | ±10% |

</details>

#### reversed

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| ts-order class | **14.7 · 1.00×** | **195 · 1.00×** | **2.31 · 1.00×** | **45.8 · 1.00×** |
| Lodash (lodash-es) | 17.7 · 1.21× | 236 · 1.21× | 2.81 · 1.21× | 53.8 · 1.17× |
| Native cached keys | 15.2 · 1.04× | 206 · 1.05× | 2.61 · 1.13× | 58.2 · 1.27× |
| Radashi sort | 23.2 · 1.59× | 314 · 1.61× | 3.71 · 1.60× | 65.3 · 1.42× |
| Native handwritten | 24 · 1.64× | 335 · 1.72×† | 3.9 · 1.69×† | 66.7 · 1.46× |
| es-toolkit | 30.7 · 2.09×† | 419 · 2.15× | 4.61 · 1.99× | 74 · 1.61× |
| Remeda | 27.9 · 1.90× | 405 · 2.08× | 4.18 · 1.81× | 74.7 · 1.63× |
| thenby | 30 · 2.05×† | 433 · 2.22× | 4.53 · 1.96× | 80.4 · 1.75× |
| ts-order comparator | 34.5 · 2.35×† | 520 · 2.67× | 4.93 · 2.13×† | 81.6 · 1.78× |
| fast-sort | 32.6 · 2.23×† | 444 · 2.27× | 4.76 · 2.06× | 84.6 · 1.85× |
| Effect Order | 45.4 · 3.10×† | 623 · 3.19× | 6.18 · 2.67× | 94.9 · 2.07× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| ts-order class | ±17% | ±5% | ±4% | ±10% |
| Lodash (lodash-es) | ±17% | ±3% | ±16% | ±9% |
| Native cached keys | ±15% | ±2% | ±4% | ±13% |
| Radashi sort | ±14% | ±6% | ±7% | ±5% |
| Native handwritten | ±12% | ±27% | ±29% | ±8% |
| es-toolkit | ±22% | ±4% | ±19% | ±8% |
| Remeda | ±20% | ±11% | ±8% | ±12% |
| thenby | ±22% | ±14% | ±8% | ±4% |
| ts-order comparator | ±24% | ±8% | ±34% | ±12% |
| fast-sort | ±23% | ±5% | ±19% | ±17% |
| Effect Order | ±26% | ±10% | ±17% | ±17% |

</details>

#### nearly-sorted

| Implementation | 100 (µs) | 1,000 (µs) | 10,000 (ms) | 100,000 (ms) |
| --- | ---: | ---: | ---: | ---: |
| ts-order class | 7.69 · 1.02× | **118 · 1.00×** | **1.62 · 1.00×** | **39.4 · 1.00×** |
| Lodash (lodash-es) | 10.9 · 1.45× | 157 · 1.33× | 2.23 · 1.38× | 47.6 · 1.21× |
| Native cached keys | 8.27 · 1.10× | 123 · 1.04× | 1.75 · 1.08×† | 48 · 1.22×† |
| Radashi sort | 7.57 · 1.00× | 161 · 1.37× | 2.47 · 1.53×† | 53.6 · 1.36× |
| Native handwritten | **7.53 · 1.00×** | 161 · 1.36× | 2.22 · 1.37× | 55.7 · 1.42× |
| Remeda | 10.5 · 1.40× | 216 · 1.83×† | 2.78 · 1.72× | 60.5 · 1.54× |
| ts-order comparator | 14 · 1.85× | 263 · 2.23×† | 3.19 · 1.97× | 64.3 · 1.63× |
| es-toolkit | 11.9 · 1.58× | 235 · 1.99×† | 2.87 · 1.77× | 64.5 · 1.64× |
| thenby | 10.2 · 1.35× | 217 · 1.84×† | 3.05 · 1.89×† | 66.7 · 1.69× |
| fast-sort | 11.7 · 1.56× | 231 · 1.96× | 2.72 · 1.68× | 67.8 · 1.72× |
| Effect Order | 18.4 · 2.44× | 324 · 2.75×† | 3.67 · 2.27× | 68.9 · 1.75× |

<details>
<summary>Round-to-round variation (not confidence intervals)</summary>

| Implementation | 100 | 1,000 | 10,000 | 100,000 |
| --- | ---: | ---: | ---: | ---: |
| ts-order class | ±2% | ±12% | ±17% | ±10% |
| Lodash (lodash-es) | ±4% | ±3% | ±16% | ±12% |
| Native cached keys | ±5% | ±1% | ±25% | ±24% |
| Radashi sort | ±8% | ±2% | ±22% | ±9% |
| Native handwritten | ±9% | ±2% | ±16% | ±5% |
| Remeda | ±6% | ±22% | ±12% | ±15% |
| ts-order comparator | ±6% | ±23% | ±7% | ±10% |
| es-toolkit | ±5% | ±190% | ±19% | ±9% |
| thenby | ±6% | ±23% | ±24% | ±2% |
| fast-sort | ±3% | ±2% | ±20% | ±7% |
| Effect Order | ±4% | ±21% | ±16% | ±10% |

</details>

## Bundle overhead

Each result is a **complete working sorting example**, not an npm install size or the whole library. The same adapters used for timing are bundled individually with the workload selectors. The native baseline contains the equivalent handwritten comparator. Each emitted bundle is executed and checked against the same reference before its size is accepted.

esbuild bundles for browser ESM / ES2022 with minification, tree shaking and legal comments removed; gzip uses level 9. No source maps, external packages, runtime polyfills, data fixtures or benchmark runner are included. ts-order resolves to its built public exports. Application glue and selector code are included; native rows show the no-library cost. Because factories accept dynamic key definitions, this measures these reusable adapters, not the smallest possible hand-specialized call for each library.

Each workload is ranked by **gzip total**, smallest first. **Extra gzip** is the difference from the no-library handwritten example. B = bytes; KiB = 1,024 bytes. Deltas are example overhead, not context-independent library sizes: compression and shared application code are non-additive.

### Stored order total, ascending

| Implementation | Gzip total | Extra gzip vs native | Minified |
| --- | ---: | ---: | ---: |
| Native handwritten | 92 B | 0 B | 83 B |
| Native cached keys | 243 B | +151 B | 312 B |
| es-toolkit | 366 B | +274 B | 569 B |
| Remeda | 388 B | +296 B | 654 B |
| thenby | 450 B | +358 B | 816 B |
| ts-order comparator | 458 B | +366 B | 794 B |
| Radashi sort | 458 B | +366 B | 759 B |
| Effect Order | 542 B | +450 B | 1.12 KiB |
| fast-sort | 831 B | +739 B | 1.70 KiB |
| ts-order class | 1.02 KiB | +954 B | 2.34 KiB |
| Lodash (lodash-es) | 6.45 KiB | +6.36 KiB | 16.89 KiB |

### Fulfillment queue: status ↑, newest first, customer surname ↑

| Implementation | Gzip total | Extra gzip vs native | Minified |
| --- | ---: | ---: | ---: |
| Native handwritten | 137 B | 0 B | 190 B |
| Native cached keys | 276 B | +139 B | 419 B |
| es-toolkit | 396 B | +259 B | 676 B |
| Remeda | 418 B | +281 B | 761 B |
| thenby | 480 B | +343 B | 923 B |
| ts-order comparator | 491 B | +354 B | 901 B |
| Effect Order | 572 B | +435 B | 1.22 KiB |
| fast-sort | 858 B | +721 B | 1.81 KiB |
| ts-order class | 1.05 KiB | +942 B | 2.45 KiB |
| Lodash (lodash-es) | 6.48 KiB | +6.35 KiB | 16.99 KiB |

### Computed line-item total after discounts, descending

| Implementation | Gzip total | Extra gzip vs native | Minified |
| --- | ---: | ---: | ---: |
| Native handwritten | 164 B | 0 B | 180 B |
| Native cached keys | 297 B | +133 B | 408 B |
| es-toolkit | 426 B | +262 B | 665 B |
| Remeda | 449 B | +285 B | 750 B |
| thenby | 508 B | +344 B | 912 B |
| ts-order comparator | 513 B | +349 B | 890 B |
| Radashi sort | 519 B | +355 B | 855 B |
| Effect Order | 597 B | +433 B | 1.21 KiB |
| fast-sort | 888 B | +724 B | 1.80 KiB |
| ts-order class | 1.08 KiB | +940 B | 2.44 KiB |
| Lodash (lodash-es) | 6.51 KiB | +6.35 KiB | 16.98 KiB |

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
- The handwritten native baseline short-circuits directly on the workload fields. A separate native decorate–sort–undecorate baseline computes keys once per item. This distinguishes library overhead from the benefits and costs of caching.
- Orders, comparator chains, selectors and rule arrays are prepared once outside timing for **every** implementation that supports reuse. Per-call work imposed by a library API remains timed. This measures repeated sorting with a reused definition, not one-shot construction or module startup.
- ts-order class means `Order.sort()` (cached keys); ts-order comparator means `by()` / `order()` passed to `slice().sort()`. They import separate public entry points. ts-order uses the local production build, not the previously published npm version.
- Lodash uses the tree-shakable `lodash-es` ESM distribution, rather than charging for the entire CommonJS library. es-toolkit uses its core `orderBy`, not its compatibility layer. Effect uses `Order.Number`, `Order.String`, `mapInput`, `flip` and `combineAll`, without an Effect runtime.
- Radashi uses its built-in numeric `sort` only for the two single-key workloads. Multi-key cells are **—**, not a custom wrapper presented as a built-in feature. Natural sorting, locale collation, missing keys, heterogeneous values, conditional rules and invalid numbers are outside this comparison; they have different semantics across libraries.
- Correctness checks compare every output object against an independent handwritten reference, including exact tie order, before timing and after each warmup/measurement phase. Tests additionally freeze nested data and cover empty, singleton, tied, negative and zero-valued keys.

## Measurement method

Each cell is the **median of 3 round means**, per complete sort. A column uses **µs** if its fastest entry is below 1 ms, otherwise **ms**; all entries within that column use the same unit. Each cell also shows its time divided by the fastest entry’s time: **1.00×** is fastest, **2.00×** takes twice as long. Bold marks the lowest observed time, not a proven statistical win. A † flags over 20% round-to-round variation. Exact variation percentages are in the collapsed tables; they are **not confidence intervals**. Raw JSON also records each round’s sample count, mean, median, p99 and Tinybench relative margin of error.

Tinybench runs synchronously and sequentially: at least 200 ms and 10 samples per implementation per cell, preceded by at least 100 ms and three warmup iterations. Implementation order is deterministically shuffled for each group and round. Seeds start at 20261119. No outliers are removed; no forced garbage collection runs between samples.

With only two rounds, the displayed center averages the two round means; the deviation is just their half-range, not a robust uncertainty estimate. Round variation includes dataset differences, JIT state, allocation pressure and machine noise. Rounds share one process: these numbers do not estimate process-to-process uncertainty. Small differences and noisy cells should not be treated as wins. There is intentionally no aggregate score that weights unrelated workloads or hides unfavorable sizes.

## Environment

- Measured: 2026-11-20T00:53:14.345Z
- Node: v24.22.3; V8: 13.6.233.17-node.63
- System: darwin 24.5.0 arm64; CPU: Apple M1 Pro; RAM: 16 GiB
- Base commit: `533ee99441631ce25396ef69b4f02147bc4fc608`; working tree dirty: **true**
- Benchmark source SHA-256: `68778847edbd1e779e04666102b41e41019fbf94331cb00cb2ff559c0031b79d` (library and benchmark TypeScript, package.json and bun.lock; generated reports excluded)

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
