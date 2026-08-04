// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { workedBarStyle, balanceBarStyle, balanceScale } from './barStyles'

describe('workedBarStyle', () => {
  it('is empty when nothing was worked', () => {
    expect(workedBarStyle(0, 8)).toEqual({})
  })

  it('produces a background gradient proportional to worked/target when under target', () => {
    const style = workedBarStyle(4, 8)
    expect(style.background).toContain('40.00%')
  })

  it('caps the bar width once worked exceeds target by 25%+', () => {
    const overStyle = workedBarStyle(100, 8)
    const cappedStyle = workedBarStyle(10, 8)
    expect(overStyle.background).toEqual(cappedStyle.background)
  })
})

describe('balanceScale', () => {
  it('is the largest absolute value across the month, treating null as zero', () => {
    expect(balanceScale([2, -5, null, 3])).toBe(5)
  })

  it('is never less than 1, so a flat-zero month still draws a valid bar', () => {
    expect(balanceScale([0, null])).toBe(1)
  })
})

describe('balanceBarStyle', () => {
  it('draws the bar to the right of center for a positive balance', () => {
    const style = balanceBarStyle(5, 10)
    expect(style.background).toContain('rgb(16 185 129 / 0.35)')
    expect(style.background).toContain('transparent 50%')
  })

  it('draws the bar to the left of center for a negative balance', () => {
    const style = balanceBarStyle(-5, 10)
    expect(style.background).toContain('rgb(244 63 94 / 0.35)')
    expect(style.background).toContain('transparent 25%')
  })
})
