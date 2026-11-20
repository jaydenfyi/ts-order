import type { OrderStep } from './order.js';
import type { Comparator } from './types.js';
import { isMissing } from './missing.js';

/** Set after the first `EvalError`, so a platform that blocks `new Function` tries only once. */
let evalBlocked = false;

/** Generated `compare` for `steps`. Undefined when the platform blocks `new Function`. */
export function generateCompare<T>(
	steps: readonly OrderStep<T>[],
): Comparator<T> | undefined {
	return generate(
		`return function(a,b){var x,y,r,m,f;${compareStepsSource(steps, undefined)}return 0}`,
		steps,
	);
}

/** Generated `sort` for `steps`: the same DSU sort as `Order#sort`, on one entry per item. Undefined when the platform blocks `new Function`. */
export function generateSort<T>(
	steps: readonly OrderStep<T>[],
): ((array: readonly T[]) => T[]) | undefined {
	const first = firstWithPredicate(steps);
	// Each item becomes an entry `{v, p<i>, k<i>}`: the item, then each step's
	// predicate result and key. The comparator reads both straight off the
	// entries, which is faster than indexes into one array per step, most when
	// the sort makes many comparisons. `F<i>` holds a predicate result while its
	// entry is built, for later steps that share the predicate.
	const flags: string[] = [];
	const fields = steps.map((step, i) => {
		const j = first[i]!;
		if (j < i) return `k${i}:F${j}?k${i}(t):void 0`;
		if (!step.predicate) return `k${i}:k${i}(t)`;
		flags.push(`F${i}`);
		return `p${i}:F${i}=!!p${i}(t),k${i}:F${i}?k${i}(t):void 0`;
	});
	return generate(
		`return function(array){var n=array.length,i,t${flags.map((f) => `,${f}`).join('')};if(n<=1)return array.slice();` +
			`var E=new Array(n);for(i=0;i<n;i++){t=array[i];E[i]={v:t,${fields.join(',')}}}` +
			`E.sort(function(a,b){var x,y,r,m,f;${compareStepsSource(steps, first)}return 0});` +
			`var out=new Array(n);for(i=0;i<n;i++)out[i]=E[i].v;return out}`,
		steps,
	);
}

/**
 * Run `body` with `M` (isMissing) and each step's key `k<i>`, comparator
 * `c<i>` and predicate `p<i>` in scope, and return its result. Undefined
 * when the platform blocks `new Function`.
 */
function generate<F>(
	body: string,
	steps: readonly OrderStep<any>[],
): F | undefined {
	if (evalBlocked) return;
	// The values go in one array, not one parameter each: spreading tens of
	// thousands of arguments overflows the stack.
	const values: unknown[] = [];
	const names = steps.map((step, i) => {
		values.push(step.key, step.compare, step.predicate);
		return `k${i}=V[${3 * i}],c${i}=V[${3 * i + 1}],p${i}=V[${3 * i + 2}]`;
	});
	const scope = names.length ? `var ${names.join(',')};` : '';
	try {
		// oxlint-disable-next-line typescript/no-implied-eval -- generating this code is the point
		return new Function('M', 'V', scope + body)(isMissing, values) as F;
	} catch (error) {
		// An order with about 100,000 steps has more variables than V8 allows in
		// one function. The plain code still works for it.
		if (!(error instanceof RangeError)) {
			if (!(error instanceof EvalError)) throw error;
			evalBlocked = true;
		}
	}
}

/**
 * Code that compares the keys in `x` and `y` with step `i`'s rules, and
 * returns from the comparator when they differ. The same rules as
 * `compareKeys` in order.ts, with the direction and `nulls` written in as
 * constants.
 */
function compareKeysSource(i: number, step: OrderStep<any>): string {
	const d = step.direction;
	const n = step.nulls;
	if (step.compare) {
		// Compare against 0 both ways so that a NaN result counts as a tie.
		const custom = `r=c${i}(x,y);if(r>0)return ${d};if(r<0)return ${-d};`;
		return n
			? `m=M(x);if(m!==M(y))return m?${n}:${-n};if(!m){${custom}}`
			: custom;
	}
	return (
		`if(x!==y){if(x!==null&&y!==null){if(x<y)return ${-d};if(x>y)return ${d};}` +
		`m=M(x);if(m!==M(y))return m?${n}:${-n!};}`
	);
}

/**
 * The steps of a comparator of `a` and `b`. They are items for `compare`, and
 * entries with keys `k<i>` and predicate results `p<i>` for `sort`, which
 * passes `first` from `firstWithPredicate`.
 */
function compareStepsSource(
	steps: readonly OrderStep<any>[],
	first: readonly number[] | undefined,
): string {
	const sort = first !== undefined;
	return steps
		.map((step, i) => {
			const keys =
				(sort ? `x=a.k${i};y=b.k${i};` : `x=k${i}(a);y=k${i}(b);`) +
				compareKeysSource(i, step);
			// The item that passes comes first. When neither passes, skip the step.
			// When an earlier step checked the same predicate, both items gave the
			// same result there, or the comparator would have returned.
			const j = first ? first[i]! : i;
			return !step.predicate
				? keys
				: j < i
					? `if(a.p${j}){${keys}}`
					: sort
						? `f=a.p${i};if(f!==b.p${i})return f?-1:1;if(f){${keys}}`
						: `f=!p${i}(a);if(f!==!p${i}(b))return f?1:-1;if(!f){${keys}}`;
		})
		.join('');
}

/**
 * For each step `i`, the first step with its predicate, or `i` when it has
 * none or no earlier step shares it. `when()` gives its guard step and the
 * steps it appends one predicate, so `sort` calls it once per item, not once
 * per step. One pass, so orders with many `when()` branches compile in linear
 * time.
 */
function firstWithPredicate(steps: readonly OrderStep<any>[]): number[] {
	const seen = new Map<unknown, number>();
	return steps.map((step, i) => {
		const p = step.predicate;
		if (!p) return i;
		if (!seen.has(p)) seen.set(p, i);
		return seen.get(p)!;
	});
}
