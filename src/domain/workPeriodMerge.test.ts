import { describe, it, expect } from 'vitest'
import { mergeAdjacentInto } from './workPeriodMerge'
import type { WorkPeriod } from '../repositories/types'

function period(id: string, start: string, end: string | null): WorkPeriod {
  return { id, date: '2024-01-01', start, end }
}

describe('mergeAdjacentInto', () => {
  it('returns incoming unchanged when no adjacent periods exist', () => {
    const incoming = period('b', '10:00', '11:00')
    const { merged, absorbed } = mergeAdjacentInto([incoming], incoming)
    expect(merged).toEqual(incoming)
    expect(absorbed).toHaveLength(0)
  })

  it('merges a period that ends exactly where incoming starts', () => {
    const a = period('a', '08:00', '09:00')
    const incoming = period('b', '09:00', '10:00')
    const { merged, absorbed } = mergeAdjacentInto([a, incoming], incoming)
    expect(merged.start).toBe('08:00')
    expect(merged.end).toBe('10:00')
    expect(absorbed).toEqual(['a'])
  })

  it('merges a period that starts exactly where incoming ends', () => {
    const incoming = period('a', '09:00', '10:00')
    const c = period('c', '10:00', '11:00')
    const { merged, absorbed } = mergeAdjacentInto([incoming, c], incoming)
    expect(merged.start).toBe('09:00')
    expect(merged.end).toBe('11:00')
    expect(absorbed).toEqual(['c'])
  })

  it('merges periods on both sides transitively', () => {
    const a = period('a', '08:00', '09:00')
    const incoming = period('b', '09:00', '10:00')
    const c = period('c', '10:00', '11:00')
    const { merged, absorbed } = mergeAdjacentInto([a, incoming, c], incoming)
    expect(merged.start).toBe('08:00')
    expect(merged.end).toBe('11:00')
    expect(absorbed).toContain('a')
    expect(absorbed).toContain('c')
    expect(absorbed).toHaveLength(2)
  })

  it('handles chains of three or more adjacent periods', () => {
    const a = period('a', '07:00', '08:00')
    const b = period('b', '08:00', '09:00')
    const incoming = period('c', '09:00', '10:00')
    const d = period('d', '10:00', '11:00')
    const { merged, absorbed } = mergeAdjacentInto([a, b, incoming, d], incoming)
    expect(merged.start).toBe('07:00')
    expect(merged.end).toBe('11:00')
    expect(absorbed).toHaveLength(3)
  })

  it('ignores HH:MM:SS precision — matches on HH:MM only', () => {
    const a = period('a', '08:00:00', '09:00:30')
    const incoming = period('b', '09:00:45', '10:00:00')
    const { merged, absorbed } = mergeAdjacentInto([a, incoming], incoming)
    expect(merged.start).toBe('08:00:00')
    expect(absorbed).toEqual(['a'])
  })

  it('does not merge when end/start differ in HH:MM', () => {
    const a = period('a', '08:00', '08:59')
    const incoming = period('b', '09:00', '10:00')
    const { merged, absorbed } = mergeAdjacentInto([a, incoming], incoming)
    expect(merged).toEqual(incoming)
    expect(absorbed).toHaveLength(0)
  })

  it('skips a period with null end when checking the p-ends-at-incoming-start direction', () => {
    const a = period('a', '08:00', null) // open period — cannot merge from this side
    const incoming = period('b', '09:00', '10:00')
    const { merged, absorbed } = mergeAdjacentInto([a, incoming], incoming)
    expect(merged).toEqual(incoming)
    expect(absorbed).toHaveLength(0)
  })

  it('does not merge incoming-end into p-start when incoming end is null', () => {
    const incoming = period('a', '09:00', null) // open
    const p = period('b', '09:00', '10:00')
    const { absorbed } = mergeAdjacentInto([incoming, p], incoming)
    // merged.end is null so the second branch never fires
    expect(absorbed).toHaveLength(0)
  })

  it('does not absorb the incoming period itself', () => {
    const incoming = period('a', '09:00', '09:00')
    const { merged, absorbed } = mergeAdjacentInto([incoming], incoming)
    expect(absorbed).toHaveLength(0)
    expect(merged.id).toBe('a')
  })

  it('preserves the incoming id on the merged result', () => {
    const a = period('a', '08:00', '09:00')
    const incoming = period('b', '09:00', '10:00')
    const { merged } = mergeAdjacentInto([a, incoming], incoming)
    expect(merged.id).toBe('b')
  })
})
