// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours } from './sprint'
import type { DatedTimeEntry } from '../../infra/repositories/types'

const config = { startDate: '2024-01-01', lengthDays: 14 }

const makeEntry = (date: string, hours: number): DatedTimeEntry => ({
  id: date,
  date,
  category: 'QA',
  hours,
})

describe('getSprintBoundaries', () => {
  it('returns the correct start and end dates for sprint 0', () => {
    const sprint = getSprintBoundaries(0, config)
    expect(sprint.index).toBe(0)
    expect(sprint.start).toBe('2024-01-01')
    expect(sprint.end).toBe('2024-01-14')
  })

  it('returns the correct start and end dates for sprint 1', () => {
    const sprint = getSprintBoundaries(1, config)
    expect(sprint.index).toBe(1)
    expect(sprint.start).toBe('2024-01-15')
    expect(sprint.end).toBe('2024-01-28')
  })
})

describe('getSprintForDate', () => {
  it('returns sprint 0 for the first day of sprint 0', () => {
    expect(getSprintForDate('2024-01-01', config).index).toBe(0)
  })

  it('returns sprint 0 for the last day of sprint 0', () => {
    expect(getSprintForDate('2024-01-14', config).index).toBe(0)
  })

  it('returns sprint 1 for the first day of sprint 1', () => {
    expect(getSprintForDate('2024-01-15', config).index).toBe(1)
  })

  it('returns sprint 2 for a date in the middle of sprint 2', () => {
    // sprint 2: 2024-01-29 → 2024-02-11; mid = 2024-02-04
    expect(getSprintForDate('2024-02-04', config).index).toBe(2)
  })
})

describe('aggregateSprintHours', () => {
  const sprint = getSprintBoundaries(0, config) // 2024-01-01 → 2024-01-14

  it('sums hours per category for entries within the sprint', () => {
    const entries = [makeEntry('2024-01-03', 3), makeEntry('2024-01-10', 5)]
    expect(aggregateSprintHours(entries, sprint)).toEqual({ QA: 8 })
  })

  it('excludes entries outside the sprint', () => {
    const entries = [makeEntry('2024-01-15', 4)] // first day of sprint 1
    expect(aggregateSprintHours(entries, sprint)).toEqual({})
  })

  it('includes only in-sprint entries when mixed with out-of-sprint entries', () => {
    const entries = [makeEntry('2024-01-05', 2), makeEntry('2024-01-20', 9)]
    expect(aggregateSprintHours(entries, sprint)).toEqual({ QA: 2 })
  })

  it('returns an empty object when there are no entries', () => {
    expect(aggregateSprintHours([], sprint)).toEqual({})
  })
})
