// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { matchScore, autoMatchCategories } from './excelMapping'
import type { ExcelRow } from '../excel'

describe('matchScore', () => {
  it('returns 0 when either string is shorter than 3 chars', () => {
    expect(matchScore('ab', 'abcdef')).toBe(0)
    expect(matchScore('abcdef', 'ab')).toBe(0)
  })

  it('returns ratio when a contains b', () => {
    expect(matchScore('coremedia', 'core')).toBe(4 / 9)
  })

  it('returns ratio when b contains a', () => {
    expect(matchScore('core', 'coremedia')).toBe(4 / 9)
  })

  it('returns 0 when strings share no substring', () => {
    expect(matchScore('apple', 'banana')).toBe(0)
  })

  it('returns 1 for identical strings', () => {
    expect(matchScore('testing', 'testing')).toBe(1)
  })
})

describe('autoMatchCategories', () => {
  const rows: ExcelRow[] = [
    { taskId: 'CORE-001', description: 'coremedia' },
    { taskId: 'QA-002', description: 'quality' },
    { taskId: 'OPS-003', description: 'operations' },
  ]

  it('maps category when score >= 0.5', () => {
    const result = autoMatchCategories(['coremedia'], rows, {})
    expect(result['coremedia']).toBe('CORE-001')
  })

  it('does not overwrite existing mapping', () => {
    const result = autoMatchCategories(['coremedia'], rows, { coremedia: 'EXISTING' })
    expect(result['coremedia']).toBe('EXISTING')
  })

  it('skips category when best score < 0.5', () => {
    const result = autoMatchCategories(['vacation'], rows, {})
    expect(result['vacation']).toBeUndefined()
  })

  it('preserves existing mappings while adding new ones', () => {
    const result = autoMatchCategories(['coremedia'], rows, { other: 'OPS-003' })
    expect(result['other']).toBe('OPS-003')
    expect(result['coremedia']).toBe('CORE-001')
  })

  it('returns empty mapping when no rows provided', () => {
    const result = autoMatchCategories(['coremedia'], [], {})
    expect(result).toEqual({})
  })

  it('selects highest scoring row', () => {
    const tightRows: ExcelRow[] = [
      { taskId: 'A', description: 'quality check' },
      { taskId: 'B', description: 'quality' },
    ]
    const result = autoMatchCategories(['quality'], tightRows, {})
    expect(result['quality']).toBe('B')
  })
})
