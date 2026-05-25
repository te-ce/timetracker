import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Timetracker',
        short_name: 'Timetracker',
        theme_color: '#ffffff',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/mocks/**',
        'src/types/**',
      ],
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 72,
        lines: 76,
        'src/domain/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
  server: {
    host: 'timetracker.localhost',
    port: 5173,
  },
})
