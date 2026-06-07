import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**'],
    css: true,
    experimental: {
      // Cache module graph between reruns — big win on large import trees
      fsModuleCache: true,
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**', 'src/types/**'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 89,
        branches: 83,
        functions: 89,
        lines: 91,
        'src/shared/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/features/**/!(*.tsx)': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/features/**/*.tsx': {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 82,
        },
        'src/shared/**/*.tsx': {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 82,
        },
      },
    },
  },
})
