---
'ts-order': minor
---

Add the `ts-order/compile` entry. `import 'ts-order/compile'` makes every `Order` run generated code, as `compile()` does, including orders created before the import. Each order generates the code for its `compare` and its `sort` on the first use of each. Results do not change, and `compile()` still works with it. Where `new Function` is blocked, orders use the normal `compare` and `sort`. Only apps that import it get the code generator, about 700 B gzipped.
