# ts-order Development Plan

## Current Task
- Confirm builder callback support for `when` is ready for review and note any follow-up edge cases if discovered.

## Progress Log
- [x] Update type definitions to model the remaining unchecked portion of the domain when chaining `when` calls.
- [x] Add runtime `exhaustive()` method that returns the underlying `Order` while enforcing compile-time exhaustiveness.
- [x] Expand type-level tests to cover chained `when` usage and `exhaustive()` expectations.
- [x] Implement the `otherwise` fallback hook and extend runtime/type coverage for guarded chains.
- [x] Allow `when` to accept an inline builder callback while remaining compatible with existing `Order` arguments.
- [x] Cover builder-driven guard blocks in runtime and type-level tests.

## Task Breakdown
- [x] Introduce conditional chaining types for `when` branches.
- [x] Overload `Order.when` (static and instance) to support type guards and return conditional chains.
- [x] Implement `otherwise` on the conditional chain with runtime wiring into `Order`.
- [x] Add an `exhaustive()` assertion on the chain.
- [x] Extend the type-level tests to cover chained `when`/`otherwise` usage and exhaustiveness checks.
- [x] Support builder callbacks for guarded `when` branches while keeping eager execution semantics.
- [x] Validate that builder-provided steps compose with existing chaining (fallbacks, shared tie-breakers, etc.).

## Notes
- Confirm fallback semantics interact correctly with shared tiebreakers appended after `otherwise`.
- Ensure static and instance `when` overloads both honor type guards without breaking existing boolean predicate behavior.
- Guard against accidentally supporting lazy builders—construct and merge builder output eagerly so DSU precomputation stays stable.
