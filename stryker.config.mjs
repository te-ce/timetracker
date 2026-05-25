/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: {
    configFile: 'vite.config.ts',
  },
  mutate: ['src/domain/**/*.ts', '!src/domain/**/*.test.ts'],
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  thresholds: { high: 80, low: 60, break: 50 },
  coverageAnalysis: 'perTest',
  ignoreStatic: true,
}
