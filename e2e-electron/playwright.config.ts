import { defineConfig } from '@playwright/test'

// Separate from the root playwright.config.ts (browser e2e): this suite drives
// the real Electron app and its native tray menu, so it needs a display
// (Xvfb in headless CI) and manages its own dev server / user-data dirs
// per test rather than Playwright's webServer/baseURL.
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 60_000,
})
