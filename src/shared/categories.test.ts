import { describe, it, expect } from 'vitest'
import { getAllCategories, isValidCustomCategoryName } from './categories'
import { DEFAULT_CATEGORIES } from '../infra/repositories/types'

describe('isValidCustomCategoryName', () => {
  it('accepts normal names', () => {
    expect(isValidCustomCategoryName('Investment A')).toBe(true)
    expect(isValidCustomCategoryName('my-project')).toBe(true)
    expect(isValidCustomCategoryName('Q1 Work')).toBe(true)
  })

  it('rejects names starting with underscore (reserved for builtins)', () => {
    expect(isValidCustomCategoryName('_CUSTOM')).toBe(false)
    expect(isValidCustomCategoryName('_LEAVE')).toBe(false)
    expect(isValidCustomCategoryName('_')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidCustomCategoryName('')).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(isValidCustomCategoryName('   ')).toBe(false)
  })
})

describe('getAllCategories', () => {
  it('returns default categories when no custom categories exist', () => {
    const result = getAllCategories([])
    expect(result).toEqual(DEFAULT_CATEGORIES)
  })

  it('appends custom categories after default ones', () => {
    const result = getAllCategories(['Investment A', 'Project X'])
    expect(result).toEqual([...DEFAULT_CATEGORIES, 'Investment A', 'Project X'])
  })

  it('deduplicates if custom category matches a default one', () => {
    const result = getAllCategories(['_COREMEDIA', 'Investment A'])
    expect(result).toEqual([...DEFAULT_CATEGORIES, 'Investment A'])
  })

  it('preserves order of custom categories', () => {
    const customs = ['Zebra', 'Alpha', 'Middle']
    const result = getAllCategories(customs)
    expect(result.slice(DEFAULT_CATEGORIES.length)).toEqual(customs)
  })
})
