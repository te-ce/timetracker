import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'electron/preload.cjs',
    'scripts/**/*.mjs',
  ],
  project: ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,cjs}'],
  ignore: [
    // Ambient type declarations — not imported, that's the point
    'src/types/**',
    // MSW test infrastructure — imported via setup.ts globals
    'src/mocks/server.ts',
  ],
  ignoreDependencies: [
    // Used by electron-builder, not imported in JS
    '@electron/rebuild',
    // Peer dep of @tailwindcss/vite — not directly imported
    'tailwindcss',
    // Unified package; individual @typescript-eslint/* packages are imported instead
    'typescript-eslint',
  ],
  ignoreExportsUsedInFile: true,
}

export default config
