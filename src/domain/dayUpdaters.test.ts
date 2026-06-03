import { describe, it, expect } from 'vitest'
import { upsertWindow, removeWindow, updatePeriodCategory, upsertSlice, removeSlice } from './dayUpdaters'
import type { Day, WorkPeriod, WorkPeriodSlice } from '../repositories/types'

function emptyDay(): Day {
  return { windows: [] }
}

function win(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, slices: [] }
}

function slice(id: string, category: string, hours: number): WorkPeriodSlice {
  return { id, category, hours }
}

describe('upsertWindow', () => {
  it('adds window when none with that id exists', () => {
    const day = emptyDay()
    const result = upsertWindow(day, win('w1', '08:00', '12:00'))
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.id).toBe('w1')
  })

  it('replaces window with same id', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = upsertWindow(day, win('w1', '09:00', '17:00'))
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.start).toBe('09:00')
  })

  it('preserves other windows', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00'), win('w2', '13:00', '17:00')] }
    const result = upsertWindow(day, win('w1', '09:00', '12:00'))
    expect(result.windows).toHaveLength(2)
    expect(result.windows.find((w) => w.id === 'w2')).toBeDefined()
  })
})

describe('removeWindow', () => {
  it('removes window with matching id', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00'), win('w2', '13:00', '17:00')] }
    const result = removeWindow(day, 'w1')
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.id).toBe('w2')
  })

  it('is a no-op when id does not exist', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = removeWindow(day, 'missing')
    expect(result.windows).toHaveLength(1)
  })
})

describe('updatePeriodCategory', () => {
  it('updates the category of the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00', '_COREMEDIA')] }
    const result = updatePeriodCategory(day, 'w1', '_RELEASE')
    expect(result.windows[0]?.category).toBe('_RELEASE')
  })

  it('leaves other periods unchanged', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00'), win('w2', '13:00', '17:00')] }
    const result = updatePeriodCategory(day, 'w1', '_SUPPORT')
    expect(result.windows.find((w) => w.id === 'w2')?.category).toBe('_COREMEDIA')
  })
})

describe('upsertSlice', () => {
  it('adds a slice to the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = upsertSlice(day, 'w1', slice('s1', '_SUPPORT', 1))
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.category).toBe('_SUPPORT')
  })

  it('replaces a slice with the same id', () => {
    const dayWithSlice = {
      ...emptyDay(),
      windows: [{ ...win('w1', '08:00', '12:00'), slices: [slice('s1', '_SUPPORT', 1)] }],
    }
    const result = upsertSlice(dayWithSlice, 'w1', slice('s1', '_SUPPORT', 2))
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.hours).toBe(2)
  })
})

describe('removeSlice', () => {
  it('removes a slice by id', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '08:00', '12:00'), slices: [slice('s1', '_SUPPORT', 1), slice('s2', '_GUILDS', 2)] }],
    }
    const result = removeSlice(day, 'w1', 's1')
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.id).toBe('s2')
  })
})
