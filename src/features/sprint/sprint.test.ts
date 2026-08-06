// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  getSprintBoundaries,
  getSprintForDate,
  aggregateSprintHours,
  sprintDayProgress,
  roundHours,
  roundHoursPerCategory,
} from './sprint'
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

describe('sprintDayProgress', () => {
  const sprint = getSprintBoundaries(0, config) // 2024-01-01 → 2024-01-14

  it('reports the elapsed day and sprint length for a date mid-sprint', () => {
    expect(sprintDayProgress(sprint, '2024-01-06')).toEqual({ day: 6, total: 14, pct: (6 / 14) * 100 })
  })

  it('clamps day to 0 for a date before the sprint starts', () => {
    expect(sprintDayProgress(sprint, '2023-12-20')).toEqual({ day: 0, total: 14, pct: 0 })
  })

  it('clamps day to the sprint length for a date after it ends', () => {
    expect(sprintDayProgress(sprint, '2024-02-01')).toEqual({ day: 14, total: 14, pct: 100 })
  })
})

describe('roundHours', () => {
  it('returns the value unchanged when step is 0', () => {
    expect(roundHours(3.27, 0, 'nearest')).toBe(3.27)
  })

  it('rounds to the nearest step', () => {
    expect(roundHours(3.27, 0.5, 'nearest')).toBe(3.5)
    expect(roundHours(3.2, 0.5, 'nearest')).toBe(3)
    expect(roundHours(3.27, 0.1, 'nearest')).toBeCloseTo(3.3)
    expect(roundHours(3.24, 1, 'nearest')).toBe(3)
  })

  it('rounds up to the step', () => {
    expect(roundHours(3.01, 0.5, 'up')).toBe(3.5)
    expect(roundHours(3, 0.5, 'up')).toBe(3)
    expect(roundHours(3.01, 1, 'up')).toBe(4)
  })

  it('rounds down to the step', () => {
    expect(roundHours(3.49, 0.5, 'down')).toBe(3)
    expect(roundHours(3.5, 0.5, 'down')).toBe(3.5)
    expect(roundHours(3.99, 1, 'down')).toBe(3)
  })

  it('avoids float drift at exact step multiples', () => {
    expect(roundHours(0.3, 0.1, 'down')).toBeCloseTo(0.3)
    expect(roundHours(0.3, 0.1, 'up')).toBeCloseTo(0.3)
  })
})

describe('roundHoursPerCategory', () => {
  it('returns the input unchanged when step is 0', () => {
    const input = { QA: 3.27, Dev: 1.13 }
    expect(roundHoursPerCategory(input, 0, 'nearest')).toEqual(input)
  })

  it('rounds every category to the given step and mode', () => {
    expect(roundHoursPerCategory({ QA: 3.27, Dev: 1.13 }, 0.5, 'nearest')).toEqual({ QA: 3.5, Dev: 1 })
  })
})
