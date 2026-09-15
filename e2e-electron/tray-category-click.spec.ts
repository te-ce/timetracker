import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

declare global {
  // eslint-disable-next-line no-var
  var __e2eClickTrayCategory: ((label: string) => void) | undefined
}

/**
 * Drives the real tray menu's main-category item (checked, no active
 * subtask) via electron/main.cjs's test-only `global.__e2eClickTrayCategory`
 * seam — same rationale as tray-stop-all.spec.ts. Not part of the default
 * `npm run e2e` run — invoke with
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

function seedStorage() {
  const storageDir = join(userDataDir, 'storage')
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(join(storageDir, 'config.json'), JSON.stringify(BASE_CONFIG))
}

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDir}`],
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, NODE_ENV: 'development', E2E_ELECTRON_TEST: 'true' },
  })
  let page = app.windows().find((p) => p.url().startsWith(DEV_URL))
  if (!page) page = await app.waitForEvent('window', { predicate: (p) => p.url().startsWith(DEV_URL) })
  await page.waitForLoadState()
  await page.evaluate(() => localStorage.setItem('msal-bootstrap-skipped', 'true'))
  await page.reload()
  await page.waitForLoadState()
  return { app, page }
}

test('clicking the checked main-category tray item (no active subtask) closes the work period', async () => {
  seedStorage()
  const { app, page } = await launchApp()

  try {
    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel(/category to start/i).selectOption(CATEGORY)
    await workSection.getByRole('button', { name: /start tracking/i }).click()
    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()

    await expect.poll(() => app.evaluate(() => typeof global.__e2eClickTrayCategory === 'function')).toBe(true)

    // The main category is checked (no subtask is running) — clicking it
    // should behave like Stop All and close the open period, not silently
    // no-op as "stop subtask" would with nothing live to stop.
    await app.evaluate((_electron, cat) => global.__e2eClickTrayCategory?.(cat), CATEGORY)

    await expect(workSection.getByRole('button', { name: /start tracking/i })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('clicking the checked main-category tray item while a subtask is live only stops the subtask', async () => {
  seedStorage()
  const { app, page } = await launchApp()

  try {
    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel(/category to start/i).selectOption(CATEGORY)
    await workSection.getByRole('button', { name: /start tracking/i }).click()
    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()

    const otherCategory = '_SUPPORT'
    await workSection.getByLabel('Subtask category').selectOption(otherCategory)
    await workSection.getByRole('button', { name: /start subtask/i }).click()

    await expect.poll(() => app.evaluate(() => typeof global.__e2eClickTrayCategory === 'function')).toBe(true)

    // The live subtask's category is checked while it's running — clicking it
    // should stop only the subtask, leaving the work period open.
    await app.evaluate((_electron, cat) => global.__e2eClickTrayCategory?.(cat), otherCategory)

    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()
  } finally {
    await app.close()
  }
})
