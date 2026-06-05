// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildConfirmedDay } from './confirmDay'
import type { Day } from '../../infra/repositories/types'

function day(overrides: Partial<Day> = {}): Day {
  return { windows: [], ...overrides }
}

describe('buildConfirmedDay', () => {
  it('marks the day as confirmed', () => {
    const result = buildConfirmedDay(day())
    expect(result.confirmed).toBe(true)
  })

  it('preserves existing windows', () => {
    const input = day({ windows: [{ id: 'w1', start: '08:00', end: '16:00', category: '_COREMEDIA', subtasks: [] }] })
    const result = buildConfirmedDay(input)
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.id).toBe('w1')
  })

  it('preserves other day fields', () => {
    const input = day({ note: 'hello', location: 'Office' })
    const result = buildConfirmedDay(input)
    expect(result.note).toBe('hello')
    expect(result.location).toBe('Office')
  })
})
