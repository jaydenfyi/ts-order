import { defineConfig } from 'vitest/config';
// import { CodegenPlugin } from './internal/unplugin/codegen.unplugin.js';
// import { codegenPluginOptions } from './tsdown.config.js';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'internal/**/*.test.ts'],
	},
	// TODO: figure out better strategy for enabling codegen only for experimental dir
	// plugins: [CodegenPlugin.vite(codegenPluginOptions)],
});
