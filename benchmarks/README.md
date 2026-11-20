# Benchmarks

[BENCHMARKS.md](../BENCHMARKS.md) and its [interactive report](../BENCHMARKS.html) compare runtime and browser bundle size against native sorting, Lodash, es-toolkit, fast-sort, Remeda, thenby, Effect, and Radashi.

- Reports time four APIs separately: class API, comparator API, compiled `sort`, and compiled `compare`.
- Orders compile before measurement, so timings exclude compile cost.
- Timings do not cover environments that block `new Function`.

## Complex orderings

[complex.md](complex.md) compares ts-order against handwritten native comparators for orderings beyond plain keys: `when()` rules, custom ranks, nulls, locale collation, nested orders, and computed keys. Run it with `bun run bench:complex`.

## Run the benchmarks

```sh
bun run bench:check # validate fixtures, adapters and bundled examples
bun run bench       # shuffled inputs: 10, 100, 1k, 10k and 100k records
bun run bench:full  # exhaustive run: same sizes, all four input shapes
bun run bench:render # rebuild the reports and charts from saved results
```

| Command                | Writes                                                                                                                          | Takes                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `bun run bench`        | `BENCHMARKS.md`, its charts `benchmarks/runtime.svg` and `bundle.svg`, `BENCHMARKS.html`, raw data in `benchmarks/results.json` | About 1 to 2 minutes         |
| `bun run bench:full`   | `benchmarks/full.md`, `full-runtime.svg`, `full-bundle.svg`, `full.html` and `full.json`                                        | 10 to 15 minutes on a laptop |
| `bun run bench:render` | The same files as the last run, from its saved JSON                                                                             | Seconds                      |
