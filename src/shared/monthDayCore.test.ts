// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { deriveMonthDayCores } from './monthDayCore'
import type { MonthData, WorkPeriod } from '../infra/repositories/types'
import type { DayType } from '../features/day/dayType'

function win(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

function openWin(id: string, start: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end: null, category, subtasks: [] }
}

describe('deriveMonthDayCores', () => {
  it('produces one core per day in the month', () => {
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData: {},
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(days).toHaveLength(31)
    expect(days[0]!.date).toBe('2026-05-01')
    expect(days[30]!.date).toBe('2026-05-31')
  })

  it('classifies weekends and workdays with no dayTypes map or override', () => {
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData: {},
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(days[0]!.dayType).toBe('WorkDay') // May 1 = Friday
    expect(days[1]!.dayType).toBe('Weekend') // May 2 = Saturday
  })

  it('prefers a per-day dayTypeOverride over the dayTypes map', () => {
    const monthData: MonthData = { '2026-05-01': { windows: [], dayTypeOverride: 'Vacation' } }
    const dayTypes = new Map<string, DayType>([['2026-05-01', 'PublicHoliday']])
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData,
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
      dayTypes,
    })
    expect(days[0]!.dayType).toBe('Vacation')
  })

  it('falls back to the dayTypes map when a day carries no override', () => {
    const dayTypes = new Map<string, DayType>([['2026-05-01', 'PublicHoliday']])
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData: {},
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
      dayTypes,
    })
    expect(days[0]!.dayType).toBe('PublicHoliday')
  })

  it('caps a past day open WorkPeriod at 23:59 rather than counting zero duration', () => {
    const monthData: MonthData = { '2026-05-18': { windows: [openWin('a', '09:00')] } }
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData,
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-19',
    })
    expect(days[17]!.workedHours).toBeGreaterThan(14)
  })

  it('computes uncategorizedHours from windows carrying the uncategorized sentinel', () => {
    const monthData: MonthData = { '2026-05-01': { windows: [win('w1', '09:00', '17:00', '_COREMEDIA')] } }
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData,
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(days[0]!.uncategorizedHours).toBe(0)

    const uncategorized: MonthData = { '2026-05-01': { windows: [win('w1', '09:00', '17:00', '_UNCATEGORIZED')] } }
    const { days: uncategorizedDays } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData: uncategorized,
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(uncategorizedDays[0]!.uncategorizedHours).toBe(8)
  })

  it('projects a planned-stop period on today to its full duration', () => {
    const today = '2026-05-19'
    const monthData: MonthData = { [today]: { windows: [win('a', '09:00', '18:00')] } }
    const { days, projectedWorkedHoursToday } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData,
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today,
      todayNow: '14:00',
    })
    const todayIdx = days.findIndex((d) => d.date === today)
    expect(days[todayIdx]!.workedHours).toBeCloseTo(5)
    expect(projectedWorkedHoursToday).toBeCloseTo(9)
  })

  it('halves targetHours and carries halfDayLeave through for a flagged WorkDay', () => {
    const monthData: MonthData = {
      '2026-05-01': { windows: [win('w1', '13:00', '17:00')], halfDayLeave: 'Vacation' },
    }
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData,
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(days[0]!.dayType).toBe('WorkDay')
    expect(days[0]!.halfDayLeave).toBe('Vacation')
    expect(days[0]!.targetHours).toBe(4) // May 1 = Friday, 8h halved
    expect(days[0]!.workedHours).toBe(4) // the actually logged window still counts in full
  })

  it('uses the full weekday target when halfDayLeave is not set', () => {
    const { days } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData: {},
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(days[0]!.targetHours).toBe(8)
    expect(days[0]!.halfDayLeave).toBeUndefined()
  })

  it('leaves projectedWorkedHoursToday undefined when todayNow is not given', () => {
    const { projectedWorkedHoursToday } = deriveMonthDayCores({
      year: 2026,
      month: 5,
      monthData: {},
      weekdayHours: [0, 8, 8, 8, 8, 8, 0],
      today: '2026-05-01',
    })
    expect(projectedWorkedHoursToday).toBeUndefined()
  })
})
