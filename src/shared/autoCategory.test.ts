// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateAutoCategory, resolveAutoCategory } from './autoCategory'

describe('calculateAutoCategory', () => {
  it('returns all WorkedHours when manualTotal is 0', () => {
    const result = calculateAutoCategory(8, 0)
    expect(result.hours).toBe(8)
    expect(result.isOverbooked).toBe(false)
  })

  it('returns the remainder when manualTotal is less than WorkedHours', () => {
    const result = calculateAutoCategory(8, 3)
    expect(result.hours).toBe(5)
    expect(result.isOverbooked).toBe(false)
  })

  it('returns 0 and not overbooked when manualTotal exactly equals WorkedHours', () => {
    const result = calculateAutoCategory(8, 8)
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(false)
  })

  it('floors at 0 and sets isOverbooked when manualTotal exceeds WorkedHours', () => {
    const result = calculateAutoCategory(8, 9)
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(true)
  })

  it('returns 0 and not overbooked when WorkedHours is 0 and manualTotal is 0', () => {
    const result = calculateAutoCategory(0, 0)
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(false)
  })

  it('returns 0 and isOverbooked when WorkedHours is 0 but manualTotal exists', () => {
    const result = calculateAutoCategory(0, 1)
    expect(result.hours).toBe(0)
    expect(result.isOverbooked).toBe(true)
  })
})

describe('resolveAutoCategory', () => {
  it('returns global default when no per-day override exists', () => {
    expect(resolveAutoCategory(undefined, 'Coremedia')).toBe('Coremedia')
  })

  it('returns per-day override when one exists', () => {
    expect(resolveAutoCategory('QA', 'Coremedia')).toBe('QA')
  })

  it('returns null when global default is null and no override', () => {
    expect(resolveAutoCategory(undefined, null)).toBeNull()
  })

  it('override takes precedence even when global is null', () => {
    expect(resolveAutoCategory('Infra', null)).toBe('Infra')
  })

  it('treats null override same as undefined (falls back to global)', () => {
    expect(resolveAutoCategory(null, 'Coremedia')).toBe('Coremedia')
  })
})
