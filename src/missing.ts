/** Whether a key counts as missing: `null`, `undefined`, `NaN` or an invalid `Date`. */
export function isMissing(value: unknown): boolean {
	return (
		value == null ||
		// eslint-disable-next-line no-self-compare -- true only for NaN
		value !== value ||
		(value instanceof Date && Number.isNaN(value.getTime()))
	);
}
