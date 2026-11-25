---
'ts-order': minor
---

Add `ts-order/match`, which builds an `Order` from ts-pattern patterns. Each case adds a group: `match<Shape>().with({ kind: 'square' }, (o) => o.by((s) => s.side)).with({ kind: 'circle' }).exhaustive()` sorts squares by side, then circles. Cases narrow the item type and `.exhaustive()` checks coverage as in ts-pattern. ts-pattern 5.5 or later is an optional peer dependency, needed only for this entry.
