import { describe, it, expect } from 'vitest'
import { upsertEntry, removeEntry, upsertWindow, removeWindow } from './dayUpdaters'
import type { Day, TimeEntry, WorkPeriod } from '../repositories/types'

function emptyDay(): Day {
  return { entries: [], windows: [] }
}

function entry(id: string, hours: number): TimeEntry {
  return { id, category: 'QA', hours }
}

function win(id: string, start: string, end: string): WorkPeriod {
  return { id, start, end }
}

describe('upsertEntry', () => {
  it('adds entry when none with that id exists', () => {
    const day = emptyDay()
    const result = upsertEntry(day, entry('e1', 3))
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.id).toBe('e1')
  })

  it('replaces entry with same id', () => {
    const day = { ...emptyDay(), entries: [entry('e1', 3)] }
    const result = upsertEntry(day, { id: 'e1', category: 'QA', hours: 5 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.hours).toBe(5)
  })

  it('preserves other entries', () => {
    const day = { ...emptyDay(), entries: [entry('e1', 3), entry('e2', 2)] }
    const result = upsertEntry(day, { id: 'e1', category: 'QA', hours: 5 })
    expect(result.entries).toHaveLength(2)
    expect(result.entries.find((e) => e.id === 'e2')?.hours).toBe(2)
  })

  it('does not mutate the input day', () => {
    const day = { ...emptyDay(), entries: [entry('e1', 3)] }
    upsertEntry(day, { id: 'e1', category: 'QA', hours: 5 })
    expect(day.entries[0]?.hours).toBe(3)
  })
})

describe('removeEntry', () => {
  it('removes entry with matching id', () => {
    const day = { ...emptyDay(), entries: [entry('e1', 3), entry('e2', 2)] }
    const result = removeEntry(day, 'e1')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.id).toBe('e2')
  })

  it('is a no-op when id does not exist', () => {
    const day = { ...emptyDay(), entries: [entry('e1', 3)] }
    const result = removeEntry(day, 'missing')
    expect(result.entries).toHaveLength(1)
  })

  it('does not mutate the input day', () => {
    const day = { ...emptyDay(), entries: [entry('e1', 3)] }
    removeEntry(day, 'e1')
    expect(day.entries).toHaveLength(1)
  })
})

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
