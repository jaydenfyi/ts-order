import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import {
	inlineCompareSteps,
	inlineSortSteps,
} from './internal/inline-steps.ts';
// import { CodegenPlugin } from './internal/unplugin/codegen.unplugin.ts';

export const codegenPluginOptions = {
	generators: {
		inlineCompareSteps,
		inlineSortSteps,
	},
} as const;

// const codegenPlugin = CodegenPlugin.rolldown(codegenPluginOptions);

export const configOptions: UserConfig = [
	{
		entry: {
			index: 'src/index.ts',
			'comparator/index': 'src/comparator/index.ts',
		},
	},
	// {
	// 	entry: {
	// 		'experimental/optimized': 'src/experimental/optimized.ts',
	// 	},
	// 	plugins: [codegenPlugin],
	// },
];

export default defineConfig(configOptions);
