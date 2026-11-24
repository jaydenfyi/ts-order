// Copied from ts-pattern 5.9.2 (dist/types), MIT License, Copyright (c) 2021 Gabriel Vergnaud.
// Only the import of ./Pattern.js changed, to the public ts-pattern/types.
import { DistributeMatchingUnions } from './DistributeUnions.js';
import { Primitives } from './helpers.js';
/**
 * If `b` only contains primitive types, then `DeepExclude<a, b>`
 * is equivalent to `Exclude<a, b>`: a primitive can only exclude
 * top-level members of the `a` union, and distributing unions
 * nested inside objects or tuples can never surface new excludable
 * cases. Since `Exclude` is much cheaper than `DistributeMatchingUnions`,
 * this fast path makes exhaustiveness checking of large enum and
 * literal unions considerably faster.
 */
export type DeepExclude<a, b> = [b] extends [Primitives] ? Exclude<a, b> : Exclude<DistributeMatchingUnions<a, b>, b>;
