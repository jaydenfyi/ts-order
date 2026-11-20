import { defineConfig } from 'vitest/config';

// The whole suite again, with `ts-order/compile` loaded before each test file.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		setupFiles: ['src/compile.setup.ts'],
	},
});
