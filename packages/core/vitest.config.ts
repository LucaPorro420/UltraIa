import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/db/**', 'src/index.ts'],
      thresholds: {
        lines: 78,
        functions: 85,
        branches: 80,
        statements: 78,
      },
    },
  },
});
