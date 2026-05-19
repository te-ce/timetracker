import { describe, it, expect } from 'vitest'
import { getAllCategories } from './categories'
import { CATEGORIES } from '../repositories/types'

describe('getAllCategories', () => {
  it('returns fixed categories when no custom categories exist', () => {
    const result = getAllCategories([])
    expect(result).toEqual(CATEGORIES)
  })

  it('appends custom categories after fixed ones', () => {
    const result = getAllCategories(['Investment A', 'Project X'])
    expect(result).toEqual([...CATEGORIES, 'Investment A', 'Project X'])
  })

  it('deduplicates if custom category matches a fixed one', () => {
    const result = getAllCategories(['QA', 'Investment A'])
    expect(result).toEqual([...CATEGORIES, 'Investment A'])
  })

  it('preserves order of custom categories', () => {
    const customs = ['Zebra', 'Alpha', 'Middle']
    const result = getAllCategories(customs)
    expect(result.slice(CATEGORIES.length)).toEqual(customs)
  })
})
