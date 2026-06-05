import { describe, it, expect } from 'vitest'
import {
  calculateCategoryHours,
  calculateTotalCategorizedHours,
  calculateUncategorizedHours,
  UNCATEGORIZED_CATEGORY,
} from './periodCategories'
import type { WorkPeriod } from '../repositories/types'

function period(
  id: string,
  start: string,
  end: string,
  category: string,
  subtasks: WorkPeriod['subtasks'] = [],
): WorkPeriod {
  return { id, start, end, category, subtasks }
}

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

describe('calculateUncategorizedHours', () => {
  it('returns 0 when no uncategorized windows', () => {
    expect(calculateUncategorizedHours([period('a', '09:00', '10:00', '_COREMEDIA')])).toBe(0)
  })

  it('returns uncategorized hours', () => {
    const windows = [period('a', '09:00', '10:00', UNCATEGORIZED_CATEGORY), period('b', '10:00', '11:00', '_COREMEDIA')]
    expect(calculateUncategorizedHours(windows)).toBeCloseTo(1)
  })

  it('returns 0 for empty windows', () => {
    expect(calculateUncategorizedHours([])).toBe(0)
  })
})
