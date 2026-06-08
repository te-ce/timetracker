export type WeekdayHours = [number, number, number, number, number, number, number]

export const DEFAULT_WEEKDAY_HOURS: WeekdayHours = [0, 8, 8, 8, 8, 8, 0]

export const WEEKDAY_ORDER_MON_SUN = [1, 2, 3, 4, 5, 6, 0] as const

export function targetHoursForDate(date: Date | string, weekdayHours: WeekdayHours): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return weekdayHours[d.getDay()] ?? 0
}
