---
'ts-order': minor
---

**Breaking (types only):** a key with no `compare` option must now be `Comparable`: `string`, `number`, `bigint`, `boolean`, `Date`, an object whose `valueOf()` returns a number or a bigint (such as a Luxon, dayjs or moment date), `null` or `undefined`. Any other object key without `compare` is now a type error, because `<` and `>` compare objects as the text `"[object Object]"`, so all object keys tied. Keys typed `unknown` also need a `compare` option or a narrower type. This applies to `Order.by`, the comparator `by` and `map`, and the exported `compare`.

`KeyOptions` now accepts explicit `undefined` values, such as `{ direction: undefined }`, under `exactOptionalPropertyTypes`. The `Comparable` and `KeyOptionsWithCompare` types are exported from the main entry.

```ts
Order.by((user: User) => user.address); // now a type error
Order.by((user: User) => user.address, { compare: byCity }); // OK
```
