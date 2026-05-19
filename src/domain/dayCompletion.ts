import type { DayType } from './dayType'

export function isDayComplete(dayType: DayType, hasWorkWindows: boolean): boolean {
  if (dayType !== 'WorkDay') return true
  return hasWorkWindows
}
