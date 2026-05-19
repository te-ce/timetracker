export type DayType = 'WorkDay' | 'Weekend' | 'PublicHoliday' | 'Vacation' | 'SickDay' | 'Absence'

export type AutoBooking = { category: 'On Leave'; hours: number }

const LEAVE_TYPES = new Set<DayType>(['Vacation', 'SickDay', 'Absence'])

export function classifyDay(date: Date): DayType {
  const dow = date.getDay()
  return dow === 0 || dow === 6 ? 'Weekend' : 'WorkDay'
}

export function isWorkWindowExpected(dayType: DayType): boolean {
  return dayType === 'WorkDay'
}

export function getAutoBooking(dayType: DayType, sollstunden: number): AutoBooking | null {
  return LEAVE_TYPES.has(dayType) ? { category: 'On Leave', hours: sollstunden } : null
}
