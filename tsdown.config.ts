import { defineConfig } from 'tsdown';

export default defineConfig({
	fixedExtension: false,
	entry: {
		index: 'src/index.ts',
		'comparator/index': 'src/comparator/index.ts',
		compile: 'src/compile.ts',
	},
});
