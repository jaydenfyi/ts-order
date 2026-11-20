---
'ts-order': minor
---

Add the `ts-order/compile` entry. `import 'ts-order/compile'` makes every `Order` generate code for its `compare` and `sort` on first use. Explicit `compile(order)` instead generates both functions immediately. Results do not change. It also covers orders created before the import, and `compile()` still works with it. Where `new Function` is blocked, orders use the normal `compare` and `sort`. Only apps that import it get the code generator, about 700 B gzipped; the main entry stays 879 B. The package's `sideEffects` field now lists `ts-order/compile`, so bundlers keep the import.
