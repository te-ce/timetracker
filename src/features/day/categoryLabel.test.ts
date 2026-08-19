import { describe, it, expect } from 'vitest'
import { categoryLabel, categoryDisplay } from './categoryLabel'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'

describe('categoryLabel', () => {
  it('keeps the UNCATEGORIZED_CATEGORY sentinel readable', () => {
    expect(categoryLabel(UNCATEGORIZED_CATEGORY)).toBe('Uncategorized')
  })

  it('returns the category as-is otherwise', () => {
    expect(categoryLabel('_LEAVE')).toBe('_LEAVE')
  })
})

describe('categoryDisplay', () => {
  it('shows the name as primary with no secondary when there is no description', () => {
    expect(categoryDisplay('_LEAVE', {}, false)).toEqual({ primary: '_LEAVE', secondary: undefined })
  })

  it('shows the name as primary and description as secondary when not preferring description', () => {
    expect(categoryDisplay('_LEAVE', { _LEAVE: 'Vacation' }, false)).toEqual({
      primary: '_LEAVE',
      secondary: 'Vacation',
    })
  })

  it('shows the description as primary and name as secondary when preferring description', () => {
    expect(categoryDisplay('_LEAVE', { _LEAVE: 'Vacation' }, true)).toEqual({
      primary: 'Vacation',
      secondary: '_LEAVE',
    })
  })

  it('falls back to the name as primary when preferring description but none exists', () => {
    expect(categoryDisplay('_LEAVE', {}, true)).toEqual({ primary: '_LEAVE', secondary: undefined })
  })

  it('keeps the UNCATEGORIZED_CATEGORY sentinel readable as the name part', () => {
    expect(categoryDisplay(UNCATEGORIZED_CATEGORY, {}, true)).toEqual({
      primary: 'Uncategorized',
      secondary: undefined,
    })
  })
})
