import type { DaySummary } from '../features/month/daySummary'
import type { WorkLocation } from '../infra/repositories/types'

export interface OfficeStats {
  officeDays: number
  totalWorkDays: number
  officePercent: number
}

/** Office/Remote split across tracked WorkDays in a month. */
export function officeStats(
  days: DaySummary[],
  locationForDate: (date: string) => WorkLocation | undefined,
): OfficeStats {
  const trackedWorkDays = days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => locationForDate(d.date) === 'Office').length
  const totalWorkDays = trackedWorkDays.length
  const officePercent = totalWorkDays > 0 ? Math.round((officeDays / totalWorkDays) * 100) : 0
  return { officeDays, totalWorkDays, officePercent }
}
