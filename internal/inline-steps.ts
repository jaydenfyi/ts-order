function indent(lines: string[], level = 1): string {
	const pad = '  '.repeat(level);
	return lines.map((line) => (line ? pad + line : line)).join('\n');
}

function genComparatorBody(stepCount: number): string {
	const body: string[] = [];
	for (let j = 0; j < stepCount; j++) {
		if (j > 0) body.push('');
		body.push(
			`${j === 0 ? 'let ' : ''}x = s${j}.key(a);`,
			`${j === 0 ? 'let ' : ''}y = s${j}.key(b);`,
			`if (c${j}) {`,
			`  const r${j} = c${j}(x, y);`,
			`  if (r${j} !== 0) return r${j} > 0 ? s${j}.direction : -s${j}.direction;`,
			`} else {`,
			`  if (x < y) return -s${j}.direction;`,
			`  if (x > y) return s${j}.direction;`,
			`}`,
		);
	}
	return ['(a, b) => {', indent(body, 1), '  return 0;', '}'].join('\n');
}

function genSortComparatorBody(stepCount: number): string[] {
	const lines: string[] = [];
	for (let j = 0; j < stepCount; j++) {
		if (j === 0) {
			lines.push(`let a = k${j}[ia];`);
			lines.push(`let b = k${j}[ib];`);
		} else {
			lines.push(`a = k${j}[ia];`);
			lines.push(`b = k${j}[ib];`);
		}
		lines.push(`if (c${j}) {`);
		lines.push(
			indent(
				[
					`const r${j} = c${j}(a, b);`,
					`if (r${j} !== 0) return r${j} > 0 ? d${j} : -d${j};`,
				],
				1,
			),
		);
		lines.push(`} else {`);
		lines.push(
			indent(
				[
					`if ((a as any) < (b as any)) return -d${j};`,
					`if ((a as any) > (b as any)) return d${j};`,
				],
				1,
			),
		);
		lines.push(`}`);
		if (j < stepCount - 1) lines.push('');
	}
	lines.push('return 0;');
	return lines;
}

function genSortBranch(stepCount: number): string {
	const declarations: string[] = [];
	for (let j = 0; j < stepCount; j++) {
		declarations.push(`const k${j} = keysPerStep[${j}]!;`);
	}
	for (let j = 0; j < stepCount; j++) {
		declarations.push(`const c${j} = cmps[${j}];`);
	}
	for (let j = 0; j < stepCount; j++) {
		declarations.push(`const d${j} = dirs[${j}] as 1 | -1;`);
	}

	const comparatorLines: string[] = [];
	comparatorLines.push('arrayIndexes.sort((ia, ib) => {');
	comparatorLines.push(indent(genSortComparatorBody(stepCount), 1));
	comparatorLines.push('});');

	const resultLines: string[] = [];
	resultLines.push('const out: T[] = new Array(arrayLength);');
	resultLines.push(
		'for (let i = 0; i < arrayLength; i++) out[i] = array[arrayIndexes[i]!]!;',
	);
	resultLines.push('return out;');

	const body: string[] = [
		...declarations,
		'',
		...comparatorLines,
		'',
		...resultLines,
	];

	return [
		// `console.log("Codegen ran");`,
		`if (numberOfSteps === ${stepCount}) {`,
		indent(body, 1),
		`}`,
	].join('\n');
}

function genBranch(stepCount: number): string {
	const declarations: string[] = [];
	const comparatorBindings: string[] = [];

	for (let j = 0; j < stepCount; j++) {
		declarations.push(`const s${j} = steps[${j}];`);
		comparatorBindings.push(`const c${j} = s${j}.compare;`);
	}

	const comparator = genComparatorBody(stepCount);

	return [
		`if (numberOfSteps === ${stepCount}) {`,
		indent(declarations, 1),
		indent(comparatorBindings, 1),
		indent([`return ${comparator};`], 1),
		`}`,
	].join('\n');
}

/**
 * Macro entrypoint.
 * @param maxSteps positive integer literal – how many step branches to inline (1..maxSteps)
 */
export function inlineCompareSteps(maxSteps: number): string {
	if (!Number.isInteger(maxSteps) || maxSteps < 1) {
		throw new Error(
			'inlineSteps(num): num must be a positive integer literal',
		);
	}

	const branches: string[] = [];
	for (let i = 1; i <= maxSteps; i++) {
		branches.push(genBranch(i));
	}

	return branches.join('\n\n');
}

export function inlineSortSteps(maxSteps: number): string {
	if (!Number.isInteger(maxSteps) || maxSteps < 1) {
		throw new Error(
			'inlineSortSteps(num): num must be a positive integer literal',
		);
	}

	const branches: string[] = [];
	for (let i = 1; i <= maxSteps; i++) {
		branches.push(genSortBranch(i));
	}

	return branches.join('\n\n');
}
