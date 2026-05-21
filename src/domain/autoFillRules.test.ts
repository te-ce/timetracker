import { describe, it, expect } from 'vitest'
import { materializeAutoFillRules } from './autoFillRules'
import type { AutoFillRule } from './autoFillRules'
import type { DayType } from './dayType'

function dayTypes(overrides: Record<string, DayType>): Map<string, DayType> {
  return new Map(Object.entries(overrides))
}

describe('materializeAutoFillRules', () => {
  it('materializes everyWorkday rule for workdays in range', () => {
    const rule: AutoFillRule = {
      id: 'r1',
      category: 'Coremedia',
      hours: 0.5,
      pattern: { type: 'everyWorkday' },
      label: 'Standup',
      materializedDates: new Set(),
    }

    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-18', // Monday
      toDate: '2026-05-22', // Friday
      dayTypes: new Map(),
    })

    expect(entries).toHaveLength(5)
    expect(entries[0]).toMatchObject({ category: 'Coremedia', hours: 0.5, date: '2026-05-18' })
    expect(entries[4].date).toBe('2026-05-22')
  })

  it('skips weekends for everyWorkday', () => {
    const rule: AutoFillRule = {
      id: 'r1',
      category: 'QA',
      hours: 1,
      pattern: { type: 'everyWorkday' },
      materializedDates: new Set(),
    }

    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-16', // Saturday
      toDate: '2026-05-17', // Sunday
      dayTypes: new Map(),
    })

    expect(entries).toHaveLength(0)
  })

  it('skips non-WorkDay days (holidays, vacation)', () => {
    const rule: AutoFillRule = {
      id: 'r1',
      category: 'QA',
      hours: 1,
      pattern: { type: 'everyWorkday' },
      materializedDates: new Set(),
    }

    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-18', // Monday
      toDate: '2026-05-20', // Wednesday
      dayTypes: dayTypes({ '2026-05-19': 'Vacation' }),
    })

    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.date)).toEqual(['2026-05-18', '2026-05-20'])
  })

  it('skips dates already in materializedDates', () => {
    const rule: AutoFillRule = {
      id: 'r1',
      category: 'QA',
      hours: 1,
      pattern: { type: 'everyWorkday' },
      materializedDates: new Set(['2026-05-18', '2026-05-19']),
    }

    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-18',
      toDate: '2026-05-20',
      dayTypes: new Map(),
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].date).toBe('2026-05-20')
  })

  it('materializes weekly rule on matching weekdays at interval', () => {
    const rule: AutoFillRule = {
      id: 'r2',
      category: 'Training, Events',
      hours: 2,
      pattern: { type: 'weekly', days: [1], intervalWeeks: 2, anchorDate: '2026-05-04' }, // Mon every 2 weeks, anchor May 4
      materializedDates: new Set(),
    }

    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-04', // anchor Monday
      toDate: '2026-05-25', // 3 weeks later
      dayTypes: new Map(),
    })

    // May 4 (week 0), May 18 (week 2) — May 11 skipped (odd week)
    expect(entries.map((e) => e.date)).toEqual(['2026-05-04', '2026-05-18'])
  })

  it('generates unique IDs for each materialized entry', () => {
    const rule: AutoFillRule = {
      id: 'r1',
      category: 'QA',
      hours: 1,
      pattern: { type: 'everyWorkday' },
      materializedDates: new Set(),
    }

    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-18',
      toDate: '2026-05-19',
      dayTypes: new Map(),
    })

    expect(entries[0].id).not.toBe(entries[1].id)
  })
})
