// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { dayDelta } from './dayDelta'

describe('dayDelta', () => {
  it('is worked minus target when the day counts toward the balance', () => {
    expect(dayDelta(9, 8, 12)).toBe(1)
  })

  it('is null when accumulatedOvertime is null (future or not-yet-loaded day)', () => {
    expect(dayDelta(9, 8, null)).toBeNull()
  })

  it('is null when nothing was worked, even if the balance is known', () => {
    expect(dayDelta(0, 8, 5)).toBeNull()
  })
})
