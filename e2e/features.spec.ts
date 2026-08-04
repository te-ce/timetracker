import { test, expect } from '@playwright/test'

const TEST_DATE = '2026-05-25'
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

function seedBase(extra: Record<string, string> = {}) {
  return {
    'msal-bootstrap-skipped': 'true',
    'timetracker_config.json': JSON.stringify(BASE_CONFIG),
    ...extra,
  }
}

// ─── Test 1: Daily booking ────────────────────────────────────────────────────

test.describe('daily booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('start work period, shows complete status', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)

    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel('New work period start').fill('09:00')
    await workSection.getByLabel('New work period end').fill('17:00')
    await workSection.getByRole('button', { name: 'Add work period' }).click()
    await expect(workSection.getByRole('listitem', { name: /work period 1, 09:00 to 17:00/i })).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText('Complete')).toBeVisible()
  })
})

// ─── Test 2: Month status propagates ─────────────────────────────────────────

const DAY_SEED = {
  [TEST_DATE]: {
    windows: [
      {
        id: 'w1',
        start: '09:00',
        end: '17:00',
        category: CATEGORY,
        subtasks: [{ id: 's1', category: CATEGORY, hours: 8 }],
      },
    ],
  },
}

test.describe('month status', () => {
  test('complete day appears green in month calendar', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({ 'timetracker_months/2026-05.json': JSON.stringify(DAY_SEED) }),
    )

    await page.goto('/month?year=2026&month=5')

    const dayCell = page.getByRole('button', { name: /25 May 2026/ })
    await expect(dayCell).toHaveClass(/bg-emerald-100/)
  })

  test('every calendar day shows a status dot', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({ 'timetracker_months/2026-05.json': JSON.stringify(DAY_SEED) }),
    )

    await page.goto('/month?year=2026&month=5')

    // Complete day: dot inside the button
    const completeCell = page.getByRole('button', { name: /25 May 2026/ })
    await expect(completeCell.locator('span.rounded-full').first()).toBeVisible()

    // Untracked workday (no data seeded for this date)
    const untrackedCell = page.getByRole('button', { name: /Monday, 4 May 2026/ })
    await expect(untrackedCell.locator('span.rounded-full').first()).toBeVisible()
  })

  test('legend shows Complete', async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())

    await page.goto('/month?year=2026&month=5')

    await expect(page.getByText('Complete')).toBeVisible()
  })
})

// ─── Test 3: Config flows to calculation ─────────────────────────────────────

test.describe('auto category', () => {
  test('configured auto category fills remaining hours after work period is added', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({ 'timetracker_config.json': JSON.stringify({ ...BASE_CONFIG, autoCategory: CATEGORY }) }),
    )

    await page.goto(`/?date=${TEST_DATE}`)

    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel('New work period start').fill('09:00')
    await workSection.getByLabel('New work period end').fill('17:00')
    await workSection.getByRole('button', { name: 'Add work period' }).click()
    await expect(workSection.getByRole('listitem', { name: /work period 1, 09:00 to 17:00/i })).toBeVisible()

    await expect(page.getByText('main', { exact: true }).first()).toBeVisible()
  })
})

// ─── Test 4: Grid view navigation ────────────────────────────────────────────

test.describe('grid view', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('clicking a date in the grid opens DayView for that date', async ({ page }) => {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    await page.goto('/table')

    const dayRow = page.getByRole('row', { name: today })
    const dayBtn = dayRow.getByTestId('day-link')
    await expect(dayBtn).toBeVisible()
    await dayBtn.click()
    await expect(page).toHaveURL(new RegExp(`\\?date=${today}`))
  })
})

// ─── Test 5: Month calendar day click navigates to DayView ───────────────────

test.describe('month calendar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('clicking a day in the calendar opens DayView for that date', async ({ page }) => {
    await page.goto('/month?year=2026&month=5')

    const dayBtn = page.getByRole('button', {
      name: 'Monday, 25 May 2026',
    })
    await expect(dayBtn).toBeVisible()
    await dayBtn.click()

    await expect(page).toHaveURL(/\?date=2026-05-25/)
    await expect(page.getByRole('region', { name: 'Work periods' })).toBeVisible()
  })

  test("today's date cell has orange circle indicator", async ({ page }) => {
    const d = new Date()
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    await page.goto(`/month?year=${year}&month=${month}`)

    const todayCell = page.locator('[aria-current="date"]')
    await expect(todayCell).toBeVisible()
    await expect(todayCell.locator('span.rounded-full.bg-orange-400')).toBeVisible()
  })
})

// ─── Test 6: Settings persist across reload ───────────────────────────────────

test.describe('settings persistence', () => {
  test('target hours change survives page reload', async ({ page }) => {
    // Use evaluate (not addInitScript) so the seed does not re-run on reload.
    await page.goto('/settings')
    await page.evaluate((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
    await page.reload()

    const input = page.getByLabel('Monday')
    await expect(input).toHaveValue('8')

    await input.fill('6')
    await page.keyboard.press('Tab')

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('timetracker_config.json')
      if (!raw) return false
      try {
        const data: unknown = JSON.parse(raw)
        if (typeof data !== 'object' || data === null) return false
        const hours: unknown = Reflect.get(data, 'weekdayHours')
        return Array.isArray(hours) && hours[1] === 6
      } catch {
        return false
      }
    })

    await page.reload()

    await expect(page.getByLabel('Monday')).toHaveValue('6')
  })
})

// ─── Test 7: Sprint view renders without crashing ────────────────────────────

test.describe('sprint view', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({
        'timetracker_config.json': JSON.stringify({
          ...BASE_CONFIG,
          sprintLengthDays: 14,
          sprintStartDate: '2026-05-19',
        }),
      }),
    )
  })

  test('sprint view loads with report and config panels', async ({ page }) => {
    await page.goto('/sprint')

    await expect(page.getByRole('region', { name: 'Sprint report' })).toBeVisible()
    await expect(page.getByLabel('Start date')).toBeVisible()
    await expect(page.getByLabel('Length')).toBeVisible()
  })
})

// ─── Test 8: Stats view aggregates every stored month ────────────────────────

test.describe('stats view', () => {
  test('shows all-time totals and fun facts from the stored months', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({
        'timetracker_months/2026-05.json': JSON.stringify(DAY_SEED),
        'timetracker_months-index.json': JSON.stringify({ '2026-05': true }),
      }),
    )

    await page.goto('/stats')

    const totals = page.getByRole('region', { name: 'All-time statistics' })
    await expect(totals).toContainText('8.00h')
    await expect(totals).toContainText('1 day across 1 month')
    await expect(page.getByRole('region', { name: 'Hours by category' })).toContainText(CATEGORY)
    await expect(page.getByRole('region', { name: 'Fun facts' })).toContainText('Earliest start ever: 09:00')
  })
})
