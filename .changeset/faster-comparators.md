---
'ts-order': patch
---

Make the comparator module faster and smaller, with no change in results. The comparator `by` checked each key for a missing value up to 5 times per comparison. It now checks twice. On Node, `by` with the default comparison is about 15% faster, and `compare` about 16% faster. The `ts-order/comparator` entry shrinks from 655 B to 638 B gzipped.
