import { describe, it, expect } from 'vitest'
import { calculateAutoCategory, resolveAutoCategory } from './autoCategory'
import type { TimeEntry } from '../repositories/types'

const makeEntry = (hours: number): TimeEntry => ({
  id: '1',
  category: 'QA',
  hours,
})

describe('calculateAutoCategory', () => {
  it('returns all WorkedHours when there are no manual entries', () => {
    const result = calculateAutoCategory(8, [])
    expect(result.hours).toBe(8)
    expect(result.isOverbooked).toBe(false)
  })

  it('returns the remainder when manual entries are less than WorkedHours', () => {
    const result = calculateAutoCategory(8, [makeEntry(3)])
    expect(result.hours).toBe(5)
    expect(result.isOverbooked).toBe(false)
  })

  it('returns 0 and not overbooked when manual entries exactly equal WorkedHours', () => {
    const result = calculateAutoCategory(8, [makeEntry(5), makeEntry(3)])
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(false)
  })

  it('floors at 0 and sets isOverbooked when manual entries exceed WorkedHours', () => {
    const result = calculateAutoCategory(8, [makeEntry(9)])
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(true)
  })

  it('returns 0 and not overbooked when WorkedHours is 0 and there are no entries', () => {
    const result = calculateAutoCategory(0, [])
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(false)
  })

  it('returns 0 and isOverbooked when WorkedHours is 0 but manual entries exist', () => {
    const result = calculateAutoCategory(0, [makeEntry(1)])
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(true)
  })
})

describe('resolveAutoCategory', () => {
  it('returns global default when no per-day override exists', () => {
    expect(resolveAutoCategory('2026-05-19', new Map(), 'Coremedia')).toBe('Coremedia')
  })

  it('returns per-day override when one exists for that date', () => {
    expect(resolveAutoCategory('2026-05-19', new Map([['2026-05-19', 'QA']]), 'Coremedia')).toBe('QA')
  })

  it('returns null when global default is null and no override', () => {
    expect(resolveAutoCategory('2026-05-19', new Map(), null)).toBeNull()
  })

  it('override takes precedence even when global is null', () => {
    expect(resolveAutoCategory('2026-05-19', new Map([['2026-05-19', 'Infra']]), null)).toBe('Infra')
  })

  it('does not return override for different date', () => {
    expect(resolveAutoCategory('2026-05-20', new Map([['2026-05-19', 'QA']]), 'Coremedia')).toBe('Coremedia')
  })
})
