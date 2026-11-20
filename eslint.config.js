import antfu from '@antfu/eslint-config';

export default antfu(
	{
		stylistic: false,
		ignores: ['.scratch/**'],
		rules: {
			'ts/consistent-type-definitions': 'off',
			'test/prefer-lowercase-title': 'off',
		},
	},
	{
		files: [
			'benchmarks/run.ts',
			'benchmarks/sizes.ts',
			'benchmarks/complex-run.ts',
		],
		rules: {
			'no-console': 'off',
			'antfu/no-top-level-await': 'off',
		},
	},
);
