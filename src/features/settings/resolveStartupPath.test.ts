import { describe, it, expect } from 'vitest'
import { resolveStartupPath } from './resolveStartupPath'

describe('resolveStartupPath', () => {
  it('day → DayView with today', () => {
    expect(resolveStartupPath('day', null, '2024-01-15')).toBe('/?date=2024-01-15')
  })

  it('undefined → DayView with today (default)', () => {
    expect(resolveStartupPath(undefined, null, '2024-01-15')).toBe('/?date=2024-01-15')
  })

  it('month → MonthView with current year/month', () => {
    expect(resolveStartupPath('month', null, '2024-03-07')).toBe('/month?year=2024&month=3')
  })

  it('table → TableView with current year/month', () => {
    expect(resolveStartupPath('table', null, '2024-03-07')).toBe('/table?year=2024&month=3')
  })

  it('table-with-log → TableView with logDate=today', () => {
    expect(resolveStartupPath('table-with-log', null, '2024-03-07')).toBe('/table?year=2024&month=3&logDate=2024-03-07')
  })

  it('last with saved path → returns saved path', () => {
    expect(resolveStartupPath('last', '/month?year=2023&month=6', '2024-01-15')).toBe('/month?year=2023&month=6')
  })

  it('last with no saved path → falls back to DayView today', () => {
    expect(resolveStartupPath('last', null, '2024-01-15')).toBe('/?date=2024-01-15')
  })
})
