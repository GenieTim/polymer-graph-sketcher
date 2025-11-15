import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Avoid running Playwright E2E tests and node_modules tests under Vitest
    // - Playwright uses its own runner and should not be loaded by Vitest
    // - Some packages include test files that vite attempts to transform; exclude them
    exclude: ['tests/e2e/**', 'node_modules/**'],
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/'
      ]
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
