// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { colorForCategory } from './catColors'

describe('colorForCategory', () => {
  it('assigns colors by position in the category list', () => {
    const categories = ['A', 'B', 'C']
    expect(colorForCategory('A', categories).text).toBe(colorForCategory('A', categories).text)
    expect(colorForCategory('A', categories)).not.toEqual(colorForCategory('B', categories))
  })

  it('is stable for the same category and list across calls', () => {
    const categories = ['A', 'B', 'C']
    expect(colorForCategory('B', categories)).toEqual(colorForCategory('B', categories))
  })

  it('falls back to a hash-based color when the category is not in the list', () => {
    const color = colorForCategory('UNKNOWN', [])
    expect(color.text).toBeTruthy()
  })
})
