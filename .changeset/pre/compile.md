---
'ts-order': minor
---

Add `compile(order)`. It returns an order with the same steps, whose `compare` and `sort` run code generated for those steps with `new Function`. `compile()` generates both before it returns, so compile an order once and reuse it. The compiled `sort` calls each key selector once per item per step, and a `when()` predicate once per item. Results are the same as the plain order. On 1,000 shuffled records in BENCHMARKS.md, `compile(order).sort()` made 1.6 to 2.2 times as many sorts per second as `order.sort()`, most for the order with three keys. Where `new Function` is blocked, such as under a strict Content Security Policy, on Cloudflare Workers or on edge runtimes, the compiled order uses the normal `compare` and `sort`. Bundlers drop the code generator from apps that import `Order` but not `compile`, so they still get 879 B gzipped. `compile()` adds about 700 B.
