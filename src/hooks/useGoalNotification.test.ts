import { describe, it, expect } from 'vitest'
import { crossedGoal } from './useGoalNotification'

describe('crossedGoal', () => {
  it('returns false on first render (no previous value)', () => {
    expect(crossedGoal(null, 0)).toBe(false)
  })

  it('returns false when remaining stays positive', () => {
    expect(crossedGoal(2, 1)).toBe(false)
  })

  it('returns false when previous was already zero', () => {
    expect(crossedGoal(0, 0)).toBe(false)
  })

  it('returns false when previous was negative', () => {
    expect(crossedGoal(-0.5, -1)).toBe(false)
  })

  it('returns true when remaining crosses from positive to exactly zero', () => {
    expect(crossedGoal(0.1, 0)).toBe(true)
  })

  it('returns true when remaining crosses from positive to negative', () => {
    expect(crossedGoal(1.5, -0.1)).toBe(true)
  })
})
