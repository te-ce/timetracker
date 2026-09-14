import { test, expect, type Page, type Locator } from '@playwright/test'

// e2e specs run outside tsconfig.app's DOM lib, so `window`/`localStorage`
// bodies passed to addInitScript/evaluate need a local ambient shape to
// type-check — this describes only what these tests actually touch.
declare const window: {
  electronAPI?: unknown
  __trayListeners: Record<string, () => void>
}

const CATEGORY = '_COREMEDIA'
const SUBTASK_CATEGORY = '_SUPPORT'
const PAST_DATE = '2026-05-25'

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

function seed(): Record<string, string> {
  return {
    'msal-bootstrap-skipped': 'true',
    'timetracker_config.json': JSON.stringify(BASE_CONFIG),
  }
}

/**
 * Stubs window.electronAPI so the app takes the Electron storage path (mirroring
 * localStorage under the same "timetracker_" prefix the browser build uses, so
 * seeding/reading via localStorage still works) and exposes tray.onStopAll's
 * captured listener on window.__trayListeners for the test to invoke — this is
 * the only way to fire "Stop All" from a Playwright browser context, since the
 * real trigger is a native tray menu Electron owns, not a page element.
 */
function stubElectronAPI(page: Page) {
  return page.addInitScript(() => {
    const listeners: Record<string, () => void> = {}
    window.__trayListeners = listeners
    window.electronAPI = {
      autolaunch: { get: () => Promise.resolve(false), set: () => Promise.resolve() },
      tray: {
        sync: () => {},
        onStartSubtask: () => {},
        offStartSubtask: () => {},
        onStopSubtask: () => {},
        offStopSubtask: () => {},
        onStopAll: (cb: () => void) => {
          listeners.stopAll = cb
        },
        offStopAll: () => {},
        onStartWorkPeriod: () => {},
        offStartWorkPeriod: () => {},
        onTogglePresentingMode: () => {},
        offTogglePresentingMode: () => {},
      },
      hotkey: {
        onToggle: () => {},
        offToggle: () => {},
        onTogglePresenting: () => {},
        offTogglePresenting: () => {},
        setGlobal: () => Promise.resolve(),
        setPresenting: () => Promise.resolve(),
      },
      storage: {
        get: (key: string) => {
          const raw = localStorage.getItem(`timetracker_${key}`)
          return Promise.resolve(raw === null ? null : JSON.parse(raw))
        },
        put: (key: string, data: unknown) => {
          localStorage.setItem(`timetracker_${key}`, JSON.stringify(data))
          return Promise.resolve()
        },
        delete: (key: string) => {
          localStorage.removeItem(`timetracker_${key}`)
          return Promise.resolve()
        },
      },
      localFolder: {
        pickFolder: () => Promise.resolve(null),
        get: () => Promise.resolve(null),
        put: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      notify: { goalReached: () => {}, sprintExportDue: () => {} },
      window: { onShow: () => {}, offShow: () => {} },
    }
  })
}

async function triggerTrayStopAll(page: Page) {
  await page.waitForFunction(() => typeof window.__trayListeners.stopAll === 'function')
  await page.evaluate(() => window.__trayListeners.stopAll?.())
}

interface DayWindow {
  start: string
  end: string | null
}

function isDayWindowArray(val: unknown): val is DayWindow[] {
  return Array.isArray(val) && val.every((w) => typeof w === 'object' && w !== null && 'start' in w && 'end' in w)
}

async function readDayWindows(page: Page, date: string): Promise<DayWindow[]> {
  const monthKey = date.slice(0, 7)
  const windows = await page.evaluate(
    ({ monthKey, date }: { monthKey: string; date: string }) => {
      const raw = localStorage.getItem(`timetracker_months/${monthKey}.json`)
      if (!raw) return undefined
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return undefined
      const day = Reflect.get(parsed, date)
      if (typeof day !== 'object' || day === null) return undefined
      return Reflect.get(day, 'windows')
    },
    { monthKey, date },
  )
  return isDayWindowArray(windows) ? windows : []
}

/** Live flow: start, run a subtask, stop it, stop work — then pin the result
 * to a known, non-adjacent slot. Left at "now", the next period started also
 * begins at "now", and the two touching periods auto-merge, hiding the bug
 * this test guards. */
async function logAndPinTodaysFirstPeriod(workSection: Locator) {
  await workSection.getByLabel(/category to start/i).selectOption(CATEGORY)
  await workSection.getByRole('button', { name: /start tracking/i }).click()
  await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()

  await workSection.getByLabel(/subtask category/i).selectOption(SUBTASK_CATEGORY)
  await workSection.getByRole('button', { name: /start subtask/i }).click()
  await expect(workSection.getByRole('button', { name: /stop subtask/i })).toBeVisible()
  await workSection.getByRole('button', { name: /stop subtask/i }).click()
  await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()

  await workSection.getByRole('button', { name: /stop work/i }).click()
  await expect(workSection.getByRole('button', { name: /start tracking/i })).toBeVisible()

  await workSection.getByRole('button', { name: /edit times of work period 1/i }).click()
  await workSection.getByLabel(/work period 1 start/i).fill('08:00')
  await workSection.getByLabel(/work period 1 end/i).fill('08:30')
  await workSection.getByRole('button', { name: /^save$/i }).click()
  await expect(workSection.getByRole('listitem', { name: /work period 1, 08:00 to 08:30/i })).toBeVisible()
}

/** A different route to a set stop time than either the Stop button or Stop All. */
async function logPastPeriodManually(page: Page) {
  await page.goto(`/?date=${PAST_DATE}`)
  const pastSection = page.getByRole('region', { name: 'Work periods' })
  await pastSection.getByLabel('New work period start').fill('09:00')
  await pastSection.getByLabel('New work period end').fill('12:00')
  await pastSection.getByRole('button', { name: 'Add work period' }).click()
  await expect(pastSection.getByRole('listitem', { name: /work period 1, 09:00 to 12:00/i })).toBeVisible()
}

test.describe('tray Stop All never overwrites an already-set stop time', () => {
  test.beforeEach(async ({ page }) => {
    await stubElectronAPI(page)
    await page.addInitScript((entries: Array<[string, string]>) => {
      for (const [k, v] of entries) localStorage.setItem(k, v)
    }, Object.entries(seed()))
  })

  test("closes only today's open period; a live-tracked today period and a manually logged past period both keep their own stop times", async ({
    page,
  }) => {
    const today = todayIso()
    await page.goto(`/?date=${today}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    // Given a fully live-tracked, pinned period today, and a manually logged past period
    await logAndPinTodaysFirstPeriod(workSection)
    await logPastPeriodManually(page)

    // When a second period is started today and Stop All fires from the tray
    await page.goto(`/?date=${today}`)
    await expect(workSection.getByRole('button', { name: /start tracking/i })).toBeVisible()
    await workSection.getByRole('button', { name: /start tracking/i }).click()
    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()

    await triggerTrayStopAll(page)

    // Then only the newly opened today period gets closed
    await expect(workSection.getByRole('button', { name: /start tracking/i })).toBeVisible()
    const todaysWindows = await readDayWindows(page, today)
    expect(todaysWindows).toHaveLength(2)
    const pinnedPeriod = todaysWindows.find((w) => w.start === '08:00')
    const newlyClosedPeriod = todaysWindows.find((w) => w.start !== '08:00')
    expect(pinnedPeriod?.end).toBe('08:30')
    expect(newlyClosedPeriod?.end).toMatch(/^\d{2}:\d{2}$/)

    // And the past day's manually logged stop time is completely untouched
    const pastWindows = await readDayWindows(page, PAST_DATE)
    expect(pastWindows[0]?.end).toBe('12:00')
  })
})
