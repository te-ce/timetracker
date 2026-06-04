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

  test('start work period, confirm day', async ({ page }) => {
    await page.goto(`/day?date=${TEST_DATE}`)

    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel('Start').fill('09:00')
    await workSection.getByLabel('End').fill('17:00')
    await workSection.getByRole('button', { name: 'Add period' }).click()
    await expect(workSection.getByRole('button', { name: /Edit period 09:00 to 17:00/ })).toBeVisible()

    await page.getByRole('button', { name: 'Confirm day' }).click()
    await expect(page.getByRole('button', { name: 'Unconfirm day' })).toBeVisible()
  })
})

// ─── Test 2: Month status propagates ─────────────────────────────────────────

test.describe('month status', () => {
  test('confirmed day appears green in month calendar', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({
        'timetracker_months/2026-05.json': JSON.stringify({
          [TEST_DATE]: {
            windows: [
              {
                id: 'w1',
                start: '09:00',
                end: '17:00',
                category: CATEGORY,
                slices: [{ id: 's1', category: CATEGORY, hours: 8 }],
              },
            ],
            confirmed: true,
          },
        }),
      }),
    )

    await page.goto('/?year=2026&month=5')

    const dayCell = page.getByRole('button', { name: /25 May 2026/ })
    await expect(dayCell).toHaveClass(/bg-emerald-100/)
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

    await page.goto(`/day?date=${TEST_DATE}`)

    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel('Start').fill('09:00')
    await workSection.getByLabel('End').fill('17:00')
    await workSection.getByRole('button', { name: 'Add period' }).click()
    await expect(workSection.getByRole('button', { name: /Edit period 09:00 to 17:00/ })).toBeVisible()

    await expect(page.getByText('base')).toBeVisible()
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

    await page.goto('/grid')

    const dayBtn = page.getByTitle(`Open ${today}`)
    await expect(dayBtn).toBeVisible()
    await dayBtn.click()
    await expect(page).toHaveURL(new RegExp(`/day\\?date=${today}`))
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
    await page.goto('/?year=2026&month=5')

    const dayBtn = page.getByRole('button', {
      name: 'Monday, 25 May 2026',
    })
    await expect(dayBtn).toBeVisible()
    await dayBtn.click()

    await expect(page).toHaveURL(/\/day\?date=2026-05-25/)
    await expect(page.getByRole('region', { name: 'Work periods' })).toBeVisible()
  })
})

// ─── Test 6: Sprint view renders without crashing ────────────────────────────

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

    await expect(page.getByRole('heading', { name: 'Sprint Report' })).toBeVisible()
    await expect(page.getByLabel('Start date')).toBeVisible()
    await expect(page.getByLabel('Length')).toBeVisible()
  })
})
