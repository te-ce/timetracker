// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calculateCategoryHours,
  calculateDayCategoryHours,
  calculateTotalCategorizedHours,
  remainderHours,
  sumCategoryHoursAcrossMonths,
  UNCATEGORIZED_CATEGORY,
} from './periodCategories'
import { DEFAULT_WEEKDAY_HOURS } from './weekdayHours'
import type { MonthData, WorkPeriod } from '../infra/repositories/types'

function period(
  id: string,
  start: string,
  end: string,
  category: string,
  subtasks: WorkPeriod['subtasks'] = [],
): WorkPeriod {
  return { id, start, end, category, subtasks }
}

describe('calculateDayCategoryHours', () => {
  // 2026-05-15 is a Friday (default target 8h)
  const FRIDAY = '2026-05-15'

  it('auto-books _LEAVE to the weekday target for a leave day with no work', () => {
    const result = calculateDayCategoryHours(
      { windows: [], dayTypeOverride: 'Vacation' },
      FRIDAY,
      DEFAULT_WEEKDAY_HOURS,
    )
    expect(result).toEqual({ _LEAVE: 8 })
  })

  it('does not auto-book _LEAVE when work is logged on a leave day', () => {
    const result = calculateDayCategoryHours(
      { windows: [period('a', '09:00', '11:00', '_COREMEDIA')], dayTypeOverride: 'SickDay' },
      FRIDAY,
      DEFAULT_WEEKDAY_HOURS,
    )
    expect(result['_LEAVE']).toBeUndefined()
    expect(result['_COREMEDIA']).toBeCloseTo(2)
  })

  it('does not auto-book _LEAVE for non-leave day types', () => {
    expect(
      calculateDayCategoryHours({ windows: [], dayTypeOverride: 'PublicHoliday' }, FRIDAY, DEFAULT_WEEKDAY_HOURS),
    ).toEqual({})
    expect(calculateDayCategoryHours({ windows: [] }, FRIDAY, DEFAULT_WEEKDAY_HOURS)).toEqual({})
  })

  it('does not auto-book _LEAVE on a zero-target weekday', () => {
    // 2026-05-16 is a Saturday (default target 0h)
    expect(
      calculateDayCategoryHours({ windows: [], dayTypeOverride: 'Vacation' }, '2026-05-16', DEFAULT_WEEKDAY_HOURS),
    ).toEqual({})
  })

  it('auto-books _LEAVE for half the target when halfDayLeave is set and no work is logged', () => {
    const result = calculateDayCategoryHours({ windows: [], halfDayLeave: 'Vacation' }, FRIDAY, DEFAULT_WEEKDAY_HOURS)
    expect(result).toEqual({ _LEAVE: 4 })
  })

  it('books both the logged work and the half-day _LEAVE credit together', () => {
    const result = calculateDayCategoryHours(
      { windows: [period('a', '09:00', '13:00', '_COREMEDIA')], halfDayLeave: 'SickDay' },
      FRIDAY,
      DEFAULT_WEEKDAY_HOURS,
    )
    expect(result['_COREMEDIA']).toBeCloseTo(4)
    expect(result['_LEAVE']).toBeCloseTo(4)
  })
})

describe('calculateCategoryHours', () => {
  it('returns empty object for no windows', () => {
    expect(calculateCategoryHours([])).toEqual({})
  })

  it('assigns full duration to window category when no slices', () => {
    const result = calculateCategoryHours([period('a', '09:00', '10:00', '_COREMEDIA')])
    expect(result['_COREMEDIA']).toBeCloseTo(1)
  })

  it('assigns full duration to UNCATEGORIZED when category is uncategorized and no slices', () => {
    const result = calculateCategoryHours([period('a', '09:00', '10:00', UNCATEGORIZED_CATEGORY)])
    expect(result[UNCATEGORIZED_CATEGORY]).toBeCloseTo(1)
  })

  it('assigns slice hours to their categories', () => {
    const w = period('a', '09:00', '11:00', '_OTHER', [
      { id: 's1', category: '_COREMEDIA', hours: 1 },
      { id: 's2', category: '_SUPPORT', hours: 1 },
    ])
    const result = calculateCategoryHours([w])
    expect(result['_COREMEDIA']).toBeCloseTo(1)
    expect(result['_SUPPORT']).toBeCloseTo(1)
    expect(result['_OTHER']).toBeUndefined()
  })

  it('assigns remainder to window category when slices do not cover full duration', () => {
    const w = period('a', '09:00', '11:00', '_RELEASE', [{ id: 's1', category: '_COREMEDIA', hours: 1 }])
    const result = calculateCategoryHours([w])
    expect(result['_COREMEDIA']).toBeCloseTo(1)
    expect(result['_RELEASE']).toBeCloseTo(1)
  })

  it('does not assign remainder when slices cover full duration', () => {
    const w = period('a', '09:00', '10:00', '_RELEASE', [{ id: 's1', category: '_COREMEDIA', hours: 1 }])
    const result = calculateCategoryHours([w])
    expect(result['_COREMEDIA']).toBeCloseTo(1)
    expect(result['_RELEASE']).toBeUndefined()
  })

  it('clamps remainder to 0 when slices exceed duration', () => {
    const w = period('a', '09:00', '10:00', '_RELEASE', [{ id: 's1', category: '_COREMEDIA', hours: 2 }])
    const result = calculateCategoryHours([w])
    expect(result['_COREMEDIA']).toBeCloseTo(2)
    expect(result['_RELEASE']).toBeUndefined()
  })

  it('ignores remainder when it is at or below the 0.001 threshold', () => {
    const w = period('a', '09:00', '10:00', '_RELEASE', [{ id: 's1', category: '_COREMEDIA', hours: 0.9999 }])
    const result = calculateCategoryHours([w])
    expect(result['_RELEASE']).toBeUndefined()
  })

  it('aggregates hours across multiple windows with the same category', () => {
    const windows = [period('a', '09:00', '10:00', '_COREMEDIA'), period('b', '11:00', '12:00', '_COREMEDIA')]
    const result = calculateCategoryHours(windows)
    expect(result['_COREMEDIA']).toBeCloseTo(2)
  })

  it('accumulates slices of the same category across windows', () => {
    const w1 = period('a', '09:00', '10:00', '_OTHER', [{ id: 's1', category: '_COREMEDIA', hours: 1 }])
    const w2 = period('b', '11:00', '12:00', '_OTHER', [{ id: 's2', category: '_COREMEDIA', hours: 1 }])
    const result = calculateCategoryHours([w1, w2])
    expect(result['_COREMEDIA']).toBeCloseTo(2)
  })

  it('handles open window (null end) as zero duration', () => {
    const w: WorkPeriod = { id: 'a', start: '09:00', end: null, category: '_COREMEDIA', subtasks: [] }
    const result = calculateCategoryHours([w])
    expect(result['_COREMEDIA']).toBeUndefined()
  })
})

describe('calculateTotalCategorizedHours', () => {
  it('returns 0 for empty windows', () => {
    expect(calculateTotalCategorizedHours([])).toBe(0)
  })

  it('excludes UNCATEGORIZED hours', () => {
    const windows = [period('a', '09:00', '10:00', UNCATEGORIZED_CATEGORY), period('b', '10:00', '11:00', '_COREMEDIA')]
    expect(calculateTotalCategorizedHours(windows)).toBeCloseTo(1)
  })

  it('sums all non-UNCATEGORIZED hours', () => {
    const windows = [period('a', '09:00', '10:00', '_COREMEDIA'), period('b', '10:00', '11:30', '_SUPPORT')]
    expect(calculateTotalCategorizedHours(windows)).toBeCloseTo(2.5)
  })
})

describe('sumCategoryHoursAcrossMonths', () => {
  function monthData(entries: Record<string, WorkPeriod[]>): MonthData {
    const data: MonthData = {}
    for (const [date, windows] of Object.entries(entries)) {
      data[date] = { windows }
    }
    return data
  }

  it('returns an empty object for no months', () => {
    expect(sumCategoryHoursAcrossMonths([])).toEqual({})
  })

  it('sums a category across days within one month', () => {
    const months = [
      monthData({
        '2026-05-01': [period('a', '09:00', '10:00', '_COREMEDIA')],
        '2026-05-02': [period('b', '09:00', '11:00', '_COREMEDIA')],
      }),
    ]
    expect(sumCategoryHoursAcrossMonths(months)).toEqual({ _COREMEDIA: 3 })
  })

  it('sums a category across multiple months', () => {
    const months = [
      monthData({ '2026-05-01': [period('a', '09:00', '10:00', '_COREMEDIA')] }),
      monthData({ '2026-06-01': [period('b', '09:00', '10:00', '_COREMEDIA')] }),
    ]
    expect(sumCategoryHoursAcrossMonths(months)).toEqual({ _COREMEDIA: 2 })
  })

  it('excludes UNCATEGORIZED hours', () => {
    const months = [monthData({ '2026-05-01': [period('a', '09:00', '10:00', UNCATEGORIZED_CATEGORY)] })]
    expect(sumCategoryHoursAcrossMonths(months)).toEqual({})
  })
})

describe('remainderHours', () => {
  it('returns duration minus subtasked hours', () => {
    expect(remainderHours(2, 1)).toBeCloseTo(1)
  })

  it('clamps to 0 when subtasked hours exceed duration', () => {
    expect(remainderHours(1, 2)).toBe(0)
  })

  it('returns 0 when duration and subtasked hours are equal', () => {
    expect(remainderHours(1, 1)).toBe(0)
  })
})
