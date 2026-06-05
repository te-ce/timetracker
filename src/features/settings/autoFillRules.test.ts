// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { materializeAutoFillRules } from './autoFillRules'
import { parseLocalDate, toLocalIso } from '../../shared/dateUtils'
import type { AutoFillRule } from './autoFillRules'
import type { DayType } from '../day/dayType'

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
    expect(entries[0]!).toMatchObject({ category: 'Coremedia', hours: 0.5, date: '2026-05-18' })
    expect(entries[4]!.date).toBe('2026-05-22')
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
    expect(entries[0]!.date).toBe('2026-05-20')
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

  it('uses local calendar weekday for weekend detection, not UTC day', () => {
    // '2026-05-18' is Monday locally. new Date('2026-05-18') parses as UTC midnight,
    // so in UTC+ timezones getUTCDay() still gives Monday but getDay() gives Sunday.
    // We verify via parseLocalDate that the implementation uses local dates.
    const monday = parseLocalDate('2026-05-18')
    expect(monday.getDay()).toBe(1) // Monday — same weekday the rule engine must use
    expect(toLocalIso(monday)).toBe('2026-05-18') // round-trip stable

    const rule: AutoFillRule = {
      id: 'r1',
      category: 'QA',
      hours: 1,
      pattern: { type: 'everyWorkday' },
      materializedDates: new Set(),
    }

    // A single day range on a Monday must produce exactly one entry
    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-18',
      toDate: '2026-05-18',
      dayTypes: new Map(),
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]!.date).toBe('2026-05-18')
  })

  it('uses local calendar weekday for weekly pattern matching', () => {
    // Anchor Monday May 4, every 2 weeks. Verify only Mon every-other-week matches.
    const rule: AutoFillRule = {
      id: 'r2',
      category: 'Sync',
      hours: 1,
      pattern: { type: 'weekly', days: [1], intervalWeeks: 2, anchorDate: '2026-05-04' },
      materializedDates: new Set(),
    }
    const entries = materializeAutoFillRules({
      rules: [rule],
      fromDate: '2026-05-04',
      toDate: '2026-05-18',
      dayTypes: new Map(),
    })
    // May 4 (week 0) and May 18 (week 2) — both Mondays by local calendar
    expect(entries.map((e) => e.date)).toEqual(['2026-05-04', '2026-05-18'])
    entries.forEach((e) => {
      expect(parseLocalDate(e.date).getDay()).toBe(1) // all Mondays
    })
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

    expect(entries[0]!.id).not.toBe(entries[1]!.id)
  })
})
