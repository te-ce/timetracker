import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['electron/preload.cjs', 'scripts/**/*.mjs'],
  project: ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,cjs}'],
  ignore: [
    // MSW test infrastructure — imported via setup.ts globals
    'src/mocks/server.ts',
    // Public API barrels (CONTRIBUTING.md: "Export the public API from index.ts") —
    // intentionally unconsumed internally, since cross-feature imports must use a direct
    // path to the source module rather than the barrel (oxlint's no-barrel-import rule).
    'src/features/day/index.ts',
    'src/features/month/index.ts',
    'src/features/table/index.ts',
    'src/features/excel/index.ts',
  ],
  ignoreBinaries: [
    // macOS system binary used by scripts/generate-icons.mjs, not an npm package
    'iconutil',
  ],
  ignoreDependencies: [
    // Used by electron-builder, not imported in JS
    '@electron/rebuild',
    // Peer dep of @tailwindcss/vite — not directly imported
    'tailwindcss',
  ],
  ignoreExportsUsedInFile: true,
}

export default config
