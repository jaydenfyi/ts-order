import assert from 'node:assert/strict';

export function assertOutput<T>(
	actual: readonly T[],
	expected: readonly T[],
	label: string,
): void {
	assert.equal(actual.length, expected.length, `${label}: output length`);
	for (let i = 0; i < expected.length; i++) {
		assert.equal(
			actual[i],
			expected[i],
			`${label}: wrong item or unstable tie at index ${i}`,
		);
	}
}

export function validateSort<T>(
	sort: (input: readonly T[]) => T[],
	input: readonly T[],
	expected: readonly T[],
	label: string,
): void {
	const original = [...input];
	const actual = sort(input);
	assert.notEqual(actual, input, `${label}: must return a new array`);
	assertOutput(actual, expected, label);
	assertOutput(input, original, `${label}: input changed`);
}
