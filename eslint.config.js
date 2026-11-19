import antfu from '@antfu/eslint-config';

export default antfu({
	stylistic: false,
	ignores: ['.scratch/**'],
	rules: {
		'ts/consistent-type-definitions': 'off',
		'test/prefer-lowercase-title': 'off',
	},
});
