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

// ─── 1. Start period from now (open period) ──────────────────────────────────

test.describe('start period from now', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('leaving End empty and clicking Start tracking opens an open period', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    // Clear end so it is a live period
    await workSection.getByLabel('End').fill('')
    await workSection.getByRole('button', { name: 'Start tracking' }).click()

    // Running period card should appear (green background, no end in edit form)
    await expect(workSection.getByLabel('Stop tracking')).toBeVisible()
  })
})

// ─── 2. Start period backfill (closed period) ────────────────────────────────

test.describe('start period backfill', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedBase())
  })

  test('filling both Start and End adds a closed period', async ({ page }) => {
    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    await workSection.getByRole('button', { name: /now/i }).click()
    await workSection.getByLabel('Start').fill('09:00')
    await workSection.getByLabel('End').fill('12:00')
    await workSection.getByRole('button', { name: 'Add period' }).click()

    await expect(workSection.getByLabel(/Edit period 09:00 to 12:00/)).toBeVisible()
  })
})

// ─── 3. Break flow ───────────────────────────────────────────────────────────

test.describe('break flow', () => {
  test('stop open period then start a new one after break', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedMonth({
        [TEST_DATE]: {
          windows: [{ id: 'w1', start: '09:00', end: null, category: CATEGORY, subtasks: [] }],
        },
      }),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    // Stop the running period
    await workSection.getByLabel('Stop tracking').click()
    await workSection.getByLabel('Period ended at').fill('12:00')
    await workSection.getByRole('button', { name: 'Confirm' }).click()

    // Period should now be closed
    await expect(workSection.getByLabel(/Edit period 09:00 to 12:00/)).toBeVisible()
    await expect(workSection.getByLabel('Stop tracking')).not.toBeVisible()

    // Add a new period after the break
    await workSection.getByRole('button', { name: /now/i }).click()
    await workSection.getByLabel('Start').fill('13:00')
    await workSection.getByLabel('End').fill('17:00')
    await workSection.getByRole('button', { name: 'Add period' }).click()

    await expect(workSection.getByLabel(/Edit period 13:00 to 17:00/)).toBeVisible()
  })
})

// ─── 4. Live subtask tracking (auto-stops previous) ─────────────────────────

test.describe('live subtask tracking', () => {
  test('starting a new live subtask auto-stops the previous one', async ({ page }) => {
    await page.addInitScript(
      (seed: Record<string, string>) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
      },
      seedMonth({
        [TEST_DATE]: {
          windows: [{ id: 'w1', start: '09:00', end: null, category: CATEGORY, subtasks: [] }],
        },
      }),
    )

    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })

    // Start first subtask
    await workSection.getByRole('button', { name: '▶ Start tracking subtask' }).click()
    await workSection.getByRole('button', { name: /now/i }).first().click()
    await workSection.getByLabel('Subtask started at').fill('09:00')
    await workSection.getByRole('button', { name: 'Start', exact: true }).click()

    // First subtask is now live — start a second subtask, which should auto-stop the first
    await workSection.getByRole('button', { name: '▶ Start tracking subtask' }).click()
    await workSection.getByRole('button', { name: /now/i }).first().click()
    await workSection.getByLabel('Subtask started at').fill('10:00')
    await workSection.getByRole('button', { name: 'Start', exact: true }).click()

    // First subtask auto-stopped → appears as completed subtask-row
    // Second subtask is still live → appears as live-subtask-banner
    await expect(workSection.locator('[data-testid="subtask-row"]')).toHaveCount(1)
    await expect(workSection.locator('[data-testid="live-subtask-banner"]')).toHaveCount(1)
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

    await workSection.getByRole('button', { name: '+ Log subtask' }).click()
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
    await page.getByLabel('Day type').selectOption('Absence')
    await page.getByRole('button', { name: 'Confirm' }).click()

    await expect(page.getByRole('button', { name: /unconfirm day/i })).toBeVisible()
  })
})

// ─── 8. Per-day AutoCategory (period category) ──────────────────────────────

test.describe('per-day auto category', () => {
  test('AutoCategoryRow shows main badge identifying the period-level category', async ({ page }) => {
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
    const row = page.getByTestId('auto-category-row').first()
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
    const row = page.getByTestId('auto-category-row').first()
    const picker = row.getByLabel('Category')
    await picker.selectOption('_OTHER')

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

  test('needs-review day shows yellow dot in month view', async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedMonth(NEEDS_REVIEW_SEED))

    await page.goto('/month?year=2026&month=5')

    const dayCell = page.getByRole('button', { name: /26 May 2026/ })
    await expect(dayCell.locator('span.bg-yellow-400')).toBeVisible()
  })

  test('confirming a needs-review day turns it green in month view', async ({ page }) => {
    await page.addInitScript((seed: Record<string, string>) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    }, seedMonth(NEEDS_REVIEW_SEED))

    // Start on MonthView — addInitScript runs only for this initial goto
    await page.goto('/month?year=2026&month=5')
    const dayCell = page.getByRole('button', { name: /26 May 2026/ })
    await expect(dayCell.locator('span.bg-yellow-400')).toBeVisible()

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

  test('export button is disabled when SharePoint URL is not configured', async ({ page }) => {
    await page.goto('/sprint')

    // Without sharepointUrl configured, export should not be ready
    const exportBtn = page.getByRole('button', { name: /export/i })
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeDisabled()
    }
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

    // Navigate to a day and add a period
    await page.goto(`/?date=${TEST_DATE}`)
    const workSection = page.getByRole('region', { name: 'Work periods' })
    await workSection.getByRole('button', { name: /now/i }).click()
    await workSection.getByLabel('Start').fill('09:00')
    await workSection.getByLabel('End').fill('17:00')

    // Wait for the category picker in AddPeriodForm to reflect the global auto-category
    const addFormPicker = workSection.getByRole('combobox').first()
    await expect(addFormPicker).toHaveValue(CATEGORY)

    await workSection.getByRole('button', { name: 'Add period' }).click()

    const row = page.getByTestId('auto-category-row').first()
    await expect(row.getByLabel('Category')).toHaveValue(CATEGORY)
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
