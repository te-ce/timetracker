import { test, expect } from '@playwright/test'

const TEST_DATE = '2026-05-26' // Monday
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

function seedMonth(days: Record<string, unknown>, extra: Record<string, string> = {}) {
  return seedBase({
    'timetracker_months/2026-05.json': JSON.stringify(days),
    ...extra,
  })
}

// ─── 1. Start and stop tracking on today ────────────────────────────────────

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test.describe('start and stop tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('starting tracking opens a period and stopping closes it', async ({ page }) => {
    await page.goto(`/?date=${todayIso()}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    await workSection.getByRole('button', { name: /start tracking/i }).click()

    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()
    await expect(workSection.getByRole('listitem', { name: /work period 1, .* to now/i })).toBeVisible()

    await workSection.getByRole('button', { name: /stop work/i }).click()

    await expect(workSection.getByRole('button', { name: /start tracking/i })).toBeVisible()
    await expect(workSection.getByRole('listitem', { name: /work period 1, .* to now/i })).toHaveCount(0)
  })
})

// ─── 2. Log a whole period on a past day ─────────────────────────────────────

test.describe('log work on a past day', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('filling start and end adds a closed period', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    await workSection.getByLabel('New work period start').fill('09:00')
    await workSection.getByLabel('New work period end').fill('12:00')
    await workSection.getByRole('button', { name: 'Add work period' }).click()

    await expect(workSection.getByRole('listitem', { name: /work period 1, 09:00 to 12:00/i })).toBeVisible()
    await expect(workSection.getByRole('button', { name: /start tracking/i })).toHaveCount(0)
  })
})

// ─── 3. Break flow ───────────────────────────────────────────────────────────

test.describe('break flow', () => {
  test('the gap between two work periods shows up as a break and can be turned into work', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedMonth({
        [TEST_DATE]: {
          windows: [
            { id: 'w1', start: '09:00', end: '12:00', category: CATEGORY, subtasks: [] },
            { id: 'w2', start: '13:00', end: '17:00', category: CATEGORY, subtasks: [] },
          ],
        },
      }),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    await expect(workSection.getByRole('listitem', { name: /break 1\.00h, 12:00 to 13:00/i })).toBeVisible()

    await workSection.getByRole('button', { name: /was work/i }).click()

    await expect(workSection.getByRole('listitem', { name: /break/i })).toHaveCount(0)
    await expect(workSection.getByRole('listitem', { name: /work period 1, 09:00 to 17:00/i })).toBeVisible()
  })
})

// ─── 4. Live subtask tracking (one thing at a time) ─────────────────────────

test.describe('live subtask tracking', () => {
  test('a subtask takes over tracking and hands it back on stop', async ({ page }) => {
    const today = todayIso()
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({
        [`timetracker_months/${today.slice(0, 7)}.json`]: JSON.stringify({
          [today]: { windows: [{ id: 'w1', start: '09:00', end: null, category: CATEGORY, subtasks: [] }] },
        }),
      }),
    )

    await page.goto(`/?date=${today}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    await workSection.getByRole('button', { name: /start subtask/i }).click()
    await workSection.getByRole('button', { name: 'Start', exact: true }).click()

    // Only one thing is tracked: the subtask took over, so it cannot be started again
    await expect(workSection.getByRole('button', { name: /stop subtask/i })).toBeVisible()
    await expect(workSection.getByRole('button', { name: /start subtask/i })).toHaveCount(0)

    await workSection.getByRole('button', { name: /stop subtask/i }).click()

    // Tracking is back on the period's own category
    await expect(workSection.getByRole('button', { name: /start subtask/i })).toBeVisible()
    await expect(workSection.getByRole('button', { name: /stop work/i })).toBeVisible()
  })
})

// ─── 5. Log subtask (plain duration) ─────────────────────────────────────────

test.describe('log subtask with plain duration', () => {
  test('adding a plain HH:MM subtask records it on the period', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedMonth({
        [TEST_DATE]: {
          windows: [{ id: 'w1', start: '09:00', end: '17:00', category: CATEGORY, subtasks: [] }],
        },
      }),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    await workSection.getByRole('button', { name: /log untracked subtask/i }).click()
    await workSection.getByLabel('Subtask duration').fill('2:00')
    await workSection.getByRole('button', { name: 'Add', exact: true }).click()

    // Subtask should appear — check for its remove button
    await expect(workSection.getByLabel(/Remove.*subtask/i).first()).toBeVisible()
  })
})

// ─── 6. WorkLocation toggle ──────────────────────────────────────────────────

test.describe('work location toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('toggling location switches between Office and Remote in the header', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)

    const locationBtn = page.getByRole('button', { name: /Work location:/i })
    const initialText = await locationBtn.textContent()
    const expectedAfterToggle = initialText?.includes('Remote') ? 'Office' : 'Remote'

    await locationBtn.click()

    // Use retrying assertion — mutation is async so text may not change immediately
    await expect(locationBtn).toContainText(expectedAfterToggle)
  })

  test('location change persists after page reload', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)

    const locationBtn = page.getByRole('button', { name: /Work location:/i })
    const before = await locationBtn.textContent()
    await locationBtn.click()
    // mutation is async — wait for UI to reflect the toggle before reading after
    await expect(locationBtn).not.toHaveText(before ?? '')
    const after = await locationBtn.textContent()

    await page.reload()

    await expect(page.getByRole('button', { name: /Work location:/i })).toHaveText(after ?? '')
    expect(after).not.toEqual(before)
  })
})

// ─── 7. DayType → leave ──────────────────────────────────────────────────────

test.describe('day type leave', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('selecting Vacation hides work periods and shows leave banner', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)

    await page.getByLabel('Day type').selectOption('Vacation')

    await expect(page.getByRole('region', { name: 'Work periods' })).not.toBeVisible()
    await expect(page.getByRole('status', { name: 'Leave day info' })).toBeVisible()
    await expect(page.getByText(/on leave/i)).toBeVisible()
  })

  test('leave banner shows configured sollstunden hours', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({ 'timetracker_config.json': JSON.stringify({ ...BASE_CONFIG, sollstunden: 6 }) }),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    await page.getByLabel('Day type').selectOption('Vacation')

    await expect(page.getByText(/6h on leave/i)).toBeVisible()
  })

  test('Confirm button stays visible on a leave day', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)
    await page.getByLabel('Day type').selectOption('SickDay')

    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible()
  })

  test('leave day can be confirmed', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)
    await page.getByLabel('Day type').selectOption('Vacation')
    await page.getByRole('button', { name: 'Confirm' }).click()

    await expect(page.getByRole('button', { name: /unconfirm day/i })).toBeVisible()
  })
})

// ─── 8. Per-day AutoCategory (period category) ──────────────────────────────

test.describe('per-day auto category', () => {
  test('the timeline marks which stretch carries the period-level category', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedMonth({
        [TEST_DATE]: {
          windows: [{ id: 'w1', start: '09:00', end: '17:00', category: CATEGORY, subtasks: [] }],
        },
      }),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    const row = page.getByRole('listitem', { name: new RegExp(`${CATEGORY}.*main`, 'i') }).first()
    await expect(row).toBeVisible()
    await expect(row.getByText('main', { exact: true })).toBeVisible()
  })

  test('changing period category does not change the global auto-category setting', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedMonth(
        {
          [TEST_DATE]: {
            windows: [{ id: 'w1', start: '09:00', end: '17:00', category: CATEGORY, subtasks: [] }],
          },
        },
        { 'timetracker_config.json': JSON.stringify({ ...BASE_CONFIG, autoCategory: CATEGORY }) },
      ),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    await page.getByLabel(/main category of work period 1/i).selectOption('_OTHER')

    // Navigate to settings and verify global auto-category unchanged
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Work' }).click()
    const globalPicker = page.getByLabel('Auto category')
    await expect(globalPicker).toHaveValue(CATEGORY)
  })
})

// ─── 9. Day note ─────────────────────────────────────────────────────────────

test.describe('day note', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('note typed in DayView persists after reload', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)

    // Open the note editor, type a note, and save it
    await page.getByRole('button', { name: 'Add a note…' }).click()
    await page.getByPlaceholder('Add a note for this day…').fill('My test note')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('timetracker_months/2026-05.json')
      if (!raw) return false
      return raw.includes('My test note')
    })

    await page.reload()

    // Note should be visible as a button (the saved note display)
    await expect(page.getByRole('button', { name: 'My test note' })).toBeVisible()
  })
})

// ─── 10. Review flow ─────────────────────────────────────────────────────────

test.describe('review flow', () => {
  const NEEDS_REVIEW_SEED = {
    [TEST_DATE]: {
      // _UNCATEGORIZED remainder → isEntriesBalanced=false → needs-review
      windows: [{ id: 'w1', start: '09:00', end: '17:00', category: '_UNCATEGORIZED', subtasks: [] }],
    },
  }

  test('needs-review day shows red dot in month view', async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedMonth(NEEDS_REVIEW_SEED))

    await page.goto('/month?year=2026&month=5')

    const dayCell = page.getByRole('button', { name: /26 May 2026/ })
    await expect(dayCell.locator('span.bg-red-400')).toBeVisible()
  })

  test('confirming a needs-review day turns it green in month view', async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedMonth(NEEDS_REVIEW_SEED))

    // Start on MonthView — addInitScript runs only for this initial goto
    await page.goto('/month?year=2026&month=5')
    const dayCell = page.getByRole('button', { name: /26 May 2026/ })
    await expect(dayCell.locator('span.bg-red-400')).toBeVisible()

    // Click day cell → client-side navigation (no addInitScript re-run)
    await dayCell.click()
    await expect(page).toHaveURL(/\?date=2026-05-26/)

    // Confirm the day
    await page.getByRole('button', { name: /confirm day/i }).click()
    await expect(page.getByRole('button', { name: /unconfirm day/i })).toBeVisible()

    // Go back to MonthView — client-side back, localStorage unchanged
    await page.goBack()
    await expect(page).toHaveURL(/\/month/)

    // Day should now be green (confirmed)
    await expect(page.getByRole('button', { name: /26 May 2026/ })).toHaveClass(/bg-emerald-100/)
    await expect(page.getByRole('button', { name: /26 May 2026/ })).toContainText('✓')
  })
})

// ─── 11. Sprint view ─────────────────────────────────────────────────────────

test.describe('sprint view', () => {
  const SPRINT_CONFIG = {
    ...BASE_CONFIG,
    sprintLengthDays: 14,
    sprintStartDate: '2026-05-19',
  }

  const SPRINT_MONTH_DATA = {
    '2026-05-26': {
      windows: [
        {
          id: 'w1',
          start: '09:00',
          end: '17:00',
          category: CATEGORY,
          subtasks: [{ id: 's1', category: CATEGORY, hours: 8 }],
        },
      ],
      confirmed: true,
    },
  }

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      {
        'msal-bootstrap-skipped': 'true',
        'timetracker_config.json': JSON.stringify(SPRINT_CONFIG),
        'timetracker_months/2026-05.json': JSON.stringify(SPRINT_MONTH_DATA),
      },
    )
  })

  test('sprint report panel is visible with seeded data', async ({ page }) => {
    await page.goto('/sprint')
    await expect(page.getByRole('heading', { name: 'Sprint Report' })).toBeVisible()
  })

  test('export button is enabled even when SharePoint URL is not configured', async ({ page }) => {
    await page.goto('/sprint')

    // Export button is always available; readiness is surfaced via a hint, not a disabled state
    const exportBtn = page.getByRole('button', { name: /export/i })
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toBeEnabled()
  })
})

// ─── 12. Settings — global auto-category ────────────────────────────────────

test.describe('settings global auto-category', () => {
  test('global auto-category setting drives the category on new work periods', async ({ page }) => {
    // Seed config with global auto-category already set
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedBase({ 'timetracker_config.json': JSON.stringify({ ...BASE_CONFIG, autoCategory: CATEGORY }) }),
    )

    // Navigate to a day and log a period
    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByLabel('New work period start').fill('09:00')
    await workSection.getByLabel('New work period end').fill('17:00')

    // The category offered for new work is the global auto-category
    await expect(workSection.getByLabel('Category for the new work period')).toHaveValue(CATEGORY)

    await workSection.getByRole('button', { name: 'Add work period' }).click()

    await expect(workSection.getByLabel(/main category of work period 1/i)).toHaveValue(CATEGORY)
  })

  test('changing auto-category in settings persists across reload', async ({ page }) => {
    // Use evaluate (not addInitScript) so the seed is not re-run on reload
    await page.goto('/settings')
    await page.evaluate((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
    await page.reload()

    await page.getByRole('tab', { name: 'Work' }).click()
    await page.getByLabel('Auto category').selectOption(CATEGORY)

    await page.waitForFunction((cat: string) => {
      const raw = localStorage.getItem('timetracker_config.json')
      if (!raw) return false
      try {
        const data: unknown = JSON.parse(raw)
        if (typeof data !== 'object' || data === null) return false
        return Reflect.get(data, 'autoCategory') === cat
      } catch {
        return false
      }
    }, CATEGORY)

    await page.reload()
    await page.getByRole('tab', { name: 'Work' }).click()
    await expect(page.getByLabel('Auto category')).toHaveValue(CATEGORY)
  })
})
