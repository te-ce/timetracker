import { describe, it, expect } from 'vitest'
import { buildWritePlan, buildArchiveRows, findUnmappedHours, hasMappedCategory } from './exportPlan'

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

describe('buildWritePlan aggregation', () => {
  const rows = [
    { taskId: 'T1', rowNumber: 3 },
    { taskId: 'T2', rowNumber: 4 },
  ]

  it('sums hours of categories mapped to the same Task ID', () => {
    const mapping = { A: 'T1', B: 'T1', C: 'T2' }
    expect(buildWritePlan(rows, mapping, { A: 2, B: 3, C: 1 })).toEqual([
      { rowNumber: 3, hours: 5 },
      { rowNumber: 4, hours: 1 },
    ])
  })

  it('treats empty and whitespace mappings as unmapped', () => {
    expect(buildWritePlan(rows, { A: '', B: '  ', C: 'T2' }, { A: 2, B: 3, C: 1 })).toEqual([
      { rowNumber: 4, hours: 1 },
    ])
  })

  it('rounds written hours to 2 decimals', () => {
    expect(buildWritePlan(rows, { A: 'T1', B: 'T1' }, { A: 0.1 + 0.2 + 37.5, B: 0.000001 })).toEqual([
      { rowNumber: 3, hours: 37.8 },
    ])
  })
})

describe('buildArchiveRows aggregation', () => {
  it('emits one row per Task ID with summed hours', () => {
    expect(buildArchiveRows({ A: 'T1', B: 'T1', C: 'T2' }, { A: 2, B: 3, C: 1 })).toEqual([
      ['T1', 5],
      ['T2', 1],
    ])
  })

  it('omits rows for blank Task IDs', () => {
    expect(buildArchiveRows({ A: '', B: 'T2' }, { A: 2, B: 1 })).toEqual([['T2', 1]])
  })

  it('rounds hours to 2 decimals', () => {
    expect(buildArchiveRows({ A: 'T1' }, { A: 37.50000000001 })).toEqual([['T1', 37.5]])
  })
})

describe('hasMappedCategory', () => {
  it('is false for undefined, empty, and blank-only mappings', () => {
    expect(hasMappedCategory(undefined)).toBe(false)
    expect(hasMappedCategory({})).toBe(false)
    expect(hasMappedCategory({ A: '', B: ' ' })).toBe(false)
  })

  it('is true when any category has a Task ID', () => {
    expect(hasMappedCategory({ A: '', B: 'T1' })).toBe(true)
  })
})

describe('findUnmappedHours', () => {
  it('lists categories with hours but no usable mapping', () => {
    const mapping = { A: 'T1', B: '' }
    expect(findUnmappedHours(mapping, { A: 2, B: 3, C: 1.5, D: 0 })).toEqual([
      { category: 'B', hours: 3 },
      { category: 'C', hours: 1.5 },
    ])
  })

  it('returns an empty list when everything is mapped', () => {
    expect(findUnmappedHours({ A: 'T1' }, { A: 2 })).toEqual([])
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
