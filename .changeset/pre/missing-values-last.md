---
'ts-order': minor
---

**Breaking:** missing keys now sort to a fixed position. A missing key is `null`, `undefined`, `NaN` or an invalid `Date`. By default, missing keys sort after all other keys, in both `asc` and `desc`. The new `nulls: 'first' | 'last'` option on `by` changes this.

Before, the default comparison used only `<` and `>`. An `undefined` or `NaN` key then tied with every other key, so the result depended on the input order, and a `null` key sorted as if it were 0.

With a custom `compare` and no `nulls` option, the comparator still receives missing keys unchanged.

The comparator module follows the same rule. The exported `compare` (and `string`) sorts missing values last. `number` and `date` now put `NaN` and invalid dates last instead of first.
