# Branch Summary: `when-narrowing`

## Project

**ts-order** — A tiny (~1KB), type-safe sorting utility for JavaScript/TypeScript providing declarative, composable, and immutable multi-key ordering logic.

Repository: https://github.com/jaydenfyi/ts-order

## Branch Objective

Enhance `Order.when()` with **type-safe conditional chaining** for discriminated-union and type-guard-driven sorting. This allows users to build exhaustive, type-narrowed sort orders where each branch only applies to a subset of the domain, with compile-time tracking of which cases remain unhandled.

## Key Features Being Introduced

### 1. Type-Guard Support in `when`
`Order.when()` now accepts TypeScript type guard predicates (`(value: T) => value is Narrow`). The returned chain carries narrowed type information so subsequent builders receive the correct subtype.

```ts
const isVip = (c: Customer): c is Vip => c.kind === 'vip';
Order.when(isVip, (order) => order.by((v) => v.priority));
//    ^ order is typed as Order<Vip> inside the builder
```

### 2. Conditional Order Chain Types
Chained `when` calls track the "remaining" unhandled union members via `ConditionalOrderChain<T, Remaining>`:

```ts
const chain = new Order<Shape>()
  .when(isCircle, circleOrder)   // Remaining: Square | Triangle
  .when(isSquare, squareOrder)   // Remaining: Triangle
  .when(isTriangle, triangleOrder); // Remaining: never
```

### 3. `otherwise()` Fallback
Provides a fallback order for values that fail all preceding guards. Returns a plain `Order<T>`, clearing conditional metadata.

```ts
new Order<Customer>()
  .when(isVip, vipOrder)
  .otherwise(regularOrder)
  .by((c) => c.id); // shared tie-breaker for all
```

### 4. `exhaustive()` Assertion
Compile-time assertion that all union members have been handled. Only callable when `Remaining` is `never`.

```ts
const finalized = chain.exhaustive(); // OK only when all cases covered
```

### 5. Builder Callback Support
`when` accepts either an `Order<Narrow>` instance **or** an inline builder callback `(order: Order<Narrow>) => Order<Narrow>`, with eager evaluation (not lazy) to keep DSU precomputation stable.

## Files Changed

| File | Status | Notes |
|------|--------|-------|
| `src/order.ts` | staged | Core implementation: type guards, conditional chains, `otherwise`, `exhaustive`, builder callbacks |
| `src/order.test.ts` | staged + unstaged | Runtime tests and type-level tests (`expectTypeOf`) for all new features |
| `PLAN.md` | staged | Development plan / progress log for this feature set |

## Current State

- **Implementation**: Complete. All planned features are implemented and type-checked.
- **Tests**: Comprehensive runtime and type-level coverage for chained `when`, `otherwise`, `exhaustive()`, and builder callbacks.
- **Documentation**: README updated with new API signatures and examples.
- **Changeset**: Patch-level changeset (`reuse comparator type`) present.

### Staged Changes (ready to commit)
- `PLAN.md` (new)
- `src/order.ts` (type narrowing, conditional chains, `otherwise`, `exhaustive`, builder support)
- `src/order.test.ts` (new test suites)

### Unstaged Changes
- `src/order.test.ts` (formatting / structural refinements — 205 insertions, 191 deletions)

## Remaining Work

- [ ] Commit or discard unstaged test formatting changes
- [ ] Final review of README examples for `when` narrowing
- [ ] Consider whether `exhaustive()` should be renamed or if additional assertion styles are needed
- [ ] Verify bundle size impact of new types (should be zero-runtime; types are erased)

## Design Decisions

- **Eager evaluation**: Builder callbacks are executed immediately and their output merged, preserving stable DSU sort behavior.
- **No lazy builders**: Avoided lazy/eager dual semantics to keep the mental model simple.
- **Predicate merging**: Chained `when` calls merge guard predicates so each step knows the full guard context.
- **Type-only `_orderRemaining`**: Uses a phantom property for type tracking; zero runtime cost.
