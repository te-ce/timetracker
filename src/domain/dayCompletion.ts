import type { DayType } from './dayType'

export function isDayComplete(dayType: DayType, hasWorkPeriods: boolean): boolean {
  if (dayType !== 'WorkDay') return true
  return hasWorkPeriods
}
