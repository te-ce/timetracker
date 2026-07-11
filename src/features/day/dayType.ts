export type DayType = 'WorkDay' | 'Weekend' | 'PublicHoliday' | 'Vacation' | 'SickDay'

import type { DayTypeOverride } from '../../infra/repositories/types'

const DAY_TYPE_OVERRIDES: readonly string[] = ['WorkDay', 'Weekend', 'PublicHoliday', 'Vacation', 'SickDay']
export function isDayTypeOverride(v: string): v is DayTypeOverride {
  return DAY_TYPE_OVERRIDES.includes(v)
}

export function classifyDayType(date: Date, holidayDates?: Set<string>): DayType {
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return 'Weekend'
  if (holidayDates) {
    const iso = date.toISOString().slice(0, 10)
    if (holidayDates.has(iso)) return 'PublicHoliday'
  }
  return 'WorkDay'
}

export function isWorkPeriodExpected(dayType: DayType): boolean {
  return dayType === 'WorkDay'
}
