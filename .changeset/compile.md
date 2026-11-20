---
'ts-order': minor
---

Add `compile(order)`. It returns an order with the same steps, whose `compare` and `sort` run code generated for those steps with `new Function`. In the Node benchmarks in BENCHMARKS.md and benchmarks/complex.md, `compile(order).sort()` was 1.2 to 2.6 times faster than `order.sort()`, and `compile(order).compare` was 1.3 to 2.3 times faster than `order.compare`. The gain is largest for orders with several plain keys (1.9 to 2.6 times) and smallest when a custom `compare`, such as a locale collator, does most of the work (1.2 to 1.4 times). Where `new Function` is blocked, such as under a strict Content Security Policy, on Cloudflare Workers or on edge runtimes, the compiled order uses the normal `compare` and `sort`. Bundlers drop the code generator from apps that import `Order` but not `compile`, so they still get 879 B gzipped.
