import { describe, it, expect } from 'vitest'
import { computeSprintGroups } from './sprintGroups'
import type { MonthGridRow } from './monthGrid'

function makeRow(date: string): MonthGridRow {
  return { date, dayType: 'WorkDay', workedHours: 0, entries: {}, autoCategoryHours: 0 }
}

describe('computeSprintGroups', () => {
  it('returns single group with empty label when no sprintStartDate', () => {
    const rows = [makeRow('2026-06-02'), makeRow('2026-06-03')]
    const result = computeSprintGroups(rows, null, 14)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('')
    expect(result[0].rows).toHaveLength(2)
  })

  it('returns single group with empty label when sprintLengthDays is 0', () => {
    const rows = [makeRow('2026-06-02')]
    const result = computeSprintGroups(rows, '2026-01-01', 0)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('')
  })

  it('groups rows into correct sprint buckets', () => {
    const rows = [
      makeRow('2026-01-01'),
      makeRow('2026-01-07'),
      makeRow('2026-01-15'),
    ]
    const result = computeSprintGroups(rows, '2026-01-01', 14)
    expect(result).toHaveLength(2)
    expect(result[0].rows).toHaveLength(2)
    expect(result[1].rows).toHaveLength(1)
  })

  it('labels groups as Sprint N+1 (1-indexed)', () => {
    const rows = [makeRow('2026-01-01'), makeRow('2026-01-15')]
    const result = computeSprintGroups(rows, '2026-01-01', 14)
    expect(result[0].label).toBe('Sprint 1')
    expect(result[1].label).toBe('Sprint 2')
  })

  it('handles empty rows', () => {
    const result = computeSprintGroups([], '2026-01-01', 14)
    expect(result).toHaveLength(0)
  })

  it('places all rows in one group when all within same sprint', () => {
    const rows = [makeRow('2026-01-01'), makeRow('2026-01-05'), makeRow('2026-01-10')]
    const result = computeSprintGroups(rows, '2026-01-01', 14)
    expect(result).toHaveLength(1)
    expect(result[0].rows).toHaveLength(3)
  })
})
