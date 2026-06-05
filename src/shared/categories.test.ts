import { describe, it, expect } from 'vitest'
import { getAllCategories } from './categories'
import { DEFAULT_CATEGORIES } from '../infra/repositories/types'

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
