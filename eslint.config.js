import antfu from '@antfu/eslint-config';

export default antfu({
	stylistic: false,
	rules: {
		'ts/consistent-type-definitions': 'off',
		'test/prefer-lowercase-title': 'off',
	},
});
