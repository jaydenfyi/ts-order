import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'comparator/index': 'src/comparator/index.ts',
	},
});
