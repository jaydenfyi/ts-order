import type { OrderStep } from './order.js';
import type { Comparator } from './types.js';
import { isMissing } from './missing.js';

/** Set after the first `EvalError`, so a platform that blocks `new Function` tries only once. */
let evalBlocked = false;

/** Generated `compare` for `steps`. Undefined when the platform blocks `new Function`. */
export function generateCompare<T>(steps: readonly OrderStep<T>[]): Comparator<T> | undefined {
	return generate(
		`return function(a,b){var x,y,r,m,f;${compareStepsSource(steps, false)}return 0}`,
		steps,
	);
}

/** Generated `sort` for `steps`: the same DSU sort as `Order#sort`, with the keys of step `i` in `K<i>`. Undefined when the platform blocks `new Function`. */
export function generateSort<T>(
	steps: readonly OrderStep<T>[],
): ((array: readonly T[]) => T[]) | undefined {
	const decorate = steps.map((step, i) =>
		step.predicate
			? `var P${i}=new Array(n),K${i}=new Array(n);` +
				`for(i=0;i<n;i++)if(P${i}[i]=!!p${i}(t=array[i]))K${i}[i]=k${i}(t);`
			: `var K${i}=new Array(n);for(i=0;i<n;i++)K${i}[i]=k${i}(array[i]);`,
	);
	return generate(
		`return function(array){var n=array.length,i,t;if(n<=1)return array.slice();${ 
			decorate.join('') 
			}var ix=new Array(n);for(i=0;i<n;i++)ix[i]=i;` +
			`ix.sort(function(a,b){var x,y,r,m,f;${compareStepsSource(steps, true)}return 0});` +
			`var out=new Array(n);for(i=0;i<n;i++)out[i]=array[ix[i]];return out}`,
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
 * indexes into the decorated arrays `K<i>` and `P<i>` for `sort`.
 */
function compareStepsSource(steps: readonly OrderStep<any>[], sort: boolean): string {
	return steps
		.map((step, i) => {
			const keys =
				(sort ? `x=K${i}[a];y=K${i}[b];` : `x=k${i}(a);y=k${i}(b);`) + compareKeysSource(i, step);
			// The item that passes comes first. When neither passes, skip the step.
			return !step.predicate
				? keys
				: sort
					? `f=P${i}[a];if(f!==P${i}[b])return f?-1:1;if(f){${keys}}`
					: `f=!p${i}(a);if(f!==!p${i}(b))return f?1:-1;if(!f){${keys}}`;
		})
		.join('');
}
