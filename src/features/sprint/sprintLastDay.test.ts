import { describe, it, expect } from 'vitest'
import { isSprintLastDay } from './sprintExportReminder'

const config = { startDate: '2026-01-05', lengthDays: 14 }

describe('isSprintLastDay', () => {
  it('is true on the final day of a sprint', () => {
    expect(isSprintLastDay('2026-01-18', config)).toBe(true)
  })

  it('is false on other days', () => {
    expect(isSprintLastDay('2026-01-17', config)).toBe(false)
    expect(isSprintLastDay('2026-01-19', config)).toBe(false)
  })
})
