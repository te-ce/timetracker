export type DayType = 'WorkDay' | 'Weekend' | 'PublicHoliday' | 'Vacation' | 'SickDay' | 'Absence'

export type AutoBooking = { category: '_LEAVE'; hours: number }

const LEAVE_TYPES = new Set<DayType>(['Vacation', 'SickDay', 'Absence'])

export function classifyDay(date: Date, holidayDates?: Set<string>): DayType {
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

export function getAutoBooking(dayType: DayType, sollstunden: number): AutoBooking | null {
  return LEAVE_TYPES.has(dayType) ? { category: '_LEAVE', hours: sollstunden } : null
}
