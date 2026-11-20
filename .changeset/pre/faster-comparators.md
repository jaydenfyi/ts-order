---
'ts-order': patch
---

Make the comparator module faster. `compare`, and the helper behind `by`, `nullsFirst`, `nullsLast`, `nansFirst` and `nansLast`, now return 0 at once for two equal values (`a === b`). The comparator `by` also checks each key for a missing value at most twice per comparison, not up to 5 times. Compared with 0.0.6 on Node, `compare` on numbers is about 14% faster, and `by` on keys with many ties is about 12% faster. The `ts-order/comparator` entry is 625 B gzipped, against 655 B in 0.0.6.

A comparator that you pass to `by` with a `nulls` option, or to `nullsFirst`, `nullsLast`, `nansFirst` or `nansLast`, is no longer called for two equal values. A correct comparator returns 0 for them, so its results do not change. A comparator that never returns 0, such as `(a, b) => (a < b ? -1 : 1)`, now gives a tie for equal values, so the next comparator decides their order.
