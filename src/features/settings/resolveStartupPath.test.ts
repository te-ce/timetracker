import { describe, it, expect } from 'vitest'
import { resolveStartupPath, normalizeLastViewPath } from './resolveStartupPath'

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

  it('last with saved path "/" (day view, no explicit date) → resolves to fresh today, not stale', () => {
    expect(resolveStartupPath('last', '/', '2024-01-15')).toBe('/?date=2024-01-15')
  })

  it('last with saved path "/?date=..." (deliberately navigated day) → returns that exact stale date', () => {
    expect(resolveStartupPath('last', '/?date=2023-06-01', '2024-01-15')).toBe('/?date=2023-06-01')
  })
})

describe('normalizeLastViewPath', () => {
  it('day view showing today → strips the date so startup resolves to a fresh today', () => {
    expect(normalizeLastViewPath('/', '?date=2024-01-15', '2024-01-15')).toBe('/')
  })

  it('day view showing a different day (user navigated away) → keeps the explicit date', () => {
    expect(normalizeLastViewPath('/', '?date=2023-06-01', '2024-01-15')).toBe('/?date=2023-06-01')
  })

  it('non-day view → passed through unchanged', () => {
    expect(normalizeLastViewPath('/month', '?year=2024&month=3', '2024-01-15')).toBe('/month?year=2024&month=3')
  })
})
