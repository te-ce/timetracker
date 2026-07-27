import { describe, it, expect } from 'vitest'
import { buildWritePlan, buildArchiveRows } from './exportPlan'

describe('buildWritePlan', () => {
  it('pairs each mapped category with the row matching its Task ID', () => {
    const rows = [
      { taskId: 'T1', rowNumber: 3 },
      { taskId: 'T2', rowNumber: 5 },
    ]
    const mapping = { CategoryA: 'T1', CategoryB: 'T2' }
    const hours = { CategoryA: 4, CategoryB: 6 }
    expect(buildWritePlan(rows, mapping, hours)).toEqual([
      { rowNumber: 3, hours: 4 },
      { rowNumber: 5, hours: 6 },
    ])
  })

  it('skips categories whose Task ID has no matching row', () => {
    const rows = [{ taskId: 'T1', rowNumber: 3 }]
    const mapping = { CategoryA: 'T1', CategoryB: 'T-missing' }
    const hours = { CategoryA: 4, CategoryB: 6 }
    expect(buildWritePlan(rows, mapping, hours)).toEqual([{ rowNumber: 3, hours: 4 }])
  })

  it('defaults to 0 hours when a mapped category has no hours entry', () => {
    const rows = [{ taskId: 'T1', rowNumber: 3 }]
    const mapping = { CategoryA: 'T1' }
    expect(buildWritePlan(rows, mapping, {})).toEqual([{ rowNumber: 3, hours: 0 }])
  })
})

describe('buildArchiveRows', () => {
  it('builds a [taskId, hours] row per mapped category', () => {
    const mapping = { CategoryA: 'T1', CategoryB: 'T2' }
    const hours = { CategoryA: 4, CategoryB: 6 }
    expect(buildArchiveRows(mapping, hours)).toEqual([
      ['T1', 4],
      ['T2', 6],
    ])
  })

  it('defaults to 0 hours when a category has no hours entry', () => {
    expect(buildArchiveRows({ CategoryA: 'T1' }, {})).toEqual([['T1', 0]])
  })
})
