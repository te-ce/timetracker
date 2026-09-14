import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

declare global {
  // eslint-disable-next-line no-var
  var __e2eClickTrayStopAll: (() => void) | undefined
}

/**
 * Drives the real, packaged tray menu (via electron/main.cjs's test-only
 * `global.__e2eClickTrayStopAll` seam — Playwright cannot click a native OS
 * tray menu directly) instead of stubbing window.electronAPI as the browser
 * e2e suite does. Slow and needs a display (Xvfb in headless CI), so it is
 * not part of the default `npm run e2e` run — invoke with
 * `npx playwright test --config=e2e-electron/playwright.config.ts`.
 */

const DEV_URL = 'http://timetracker.localhost:5173'
const CATEGORY = '_COREMEDIA'

const BASE_CONFIG = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 14,
  sprintStartDate: null,
  customCategories: [],
  sharepointUrl: null,
  targetSheet: null,
  categoryMapping: {},
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function waitForDevServer(): Promise<void> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(DEV_URL)
      if (res.ok) return
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Dev server at ${DEV_URL} did not start in time`)
}

let devServer: ChildProcess
let userDataDir: string

test.beforeAll(async () => {
  devServer = spawn('npm', ['run', 'dev', '--', '--host', 'timetracker.localhost', '--port', '5173', '--strictPort'], {
    cwd: join(import.meta.dirname, '..'),
    stdio: 'ignore',
  })
  await waitForDevServer()
})

test.afterAll(() => {
  devServer.kill()
})

test.beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'timetracker-e2e-'))
})

test.afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true })
})

function seedStorage(today: string) {
  const storageDir = join(userDataDir, 'storage')
  mkdirSync(join(storageDir, 'months'), { recursive: true })
  writeFileSync(join(storageDir, 'config.json'), JSON.stringify(BASE_CONFIG))
  const monthKey = today.slice(0, 7)
  writeFileSync(
    join(storageDir, `months/${monthKey}.json`),
    JSON.stringify({
      [today]: {
        windows: [{ id: 'already-closed', start: '06:00', end: '06:30', category: CATEGORY, subtasks: [] }],
      },
    }),
  )
}

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`],
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, NODE_ENV: 'development', E2E_ELECTRON_TEST: 'true' },
  })
  // isDev also opens a DevTools window; find the app's own window by URL
  // rather than assuming firstWindow() is it.
  let page = app.windows().find((p) => p.url().startsWith(DEV_URL))
  if (!page) page = await app.waitForEvent('window', { predicate: (p) => p.url().startsWith(DEV_URL) })
  await page.waitForLoadState()
  // needsSetup is computed once at module load from localStorage — seed and
  // reload so Root.tsx picks it up rather than showing the setup wizard.
  await page.evaluate(() => localStorage.setItem('msal-bootstrap-skipped', 'true'))
  await page.reload()
  await page.waitForLoadState()
  return { app, page }
}

test('the real tray "Stop All" menu item closes only the open period, leaving an already-closed one untouched', async () => {
  const today = todayIso()
  seedStorage(today)
  const { app, page } = await launchApp()

  try {
    const workSection = page.getByRole('region', { name: 'Work periods' })
    await expect(workSection.getByRole('listitem', { name: /work period 1, 06:00 to 06:30/i })).toBeVisible()

    await workSection.getByLabel(/category to start/i).selectOption(CATEGORY)
    await workSection.getByRole('button', { name: /start tracking/i }).click()
    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()

    // Give the renderer's tray:sync a moment to reach main, so buildTrayMenu()
    // has rebuilt with "Stop All" present before we click it.
    await expect.poll(() => app.evaluate(() => typeof global.__e2eClickTrayStopAll === 'function')).toBe(true)

    // When the real "Stop All" tray menu item is clicked
    await app.evaluate(() => global.__e2eClickTrayStopAll?.())

    // Then the newly opened period closes and the pre-existing closed period is untouched
    await expect(workSection.getByRole('button', { name: /start tracking/i })).toBeVisible()
    await expect(workSection.getByRole('listitem', { name: /work period 1, 06:00 to 06:30/i })).toBeVisible()
    await expect(workSection.getByRole('listitem', { name: /work period 2, .* to \d{2}:\d{2}/i })).toBeVisible()
  } finally {
    await app.close()
  }
})
