export interface MonthStats {
  totalHours: number
  targetHours: number
  overtime: number
  fulfillmentPercent: number
}

export interface OvertimeToDate {
  /** Cumulative overtime/undertime for all tracked days up to and including today */
  value: number
  /** Hours still needed today: sollstunden - workedHoursToday (floored at 0) */
  hoursNeededToday: number
}

export function calculateMonthStats(
  workedHoursPerDay: number[],
  _workDayCount: number,
  sollstunden: number,
): MonthStats {
  const totalHours = workedHoursPerDay.reduce((sum, h) => sum + h, 0)
  // Only count days with tracked hours toward target
  const trackedDayCount = workedHoursPerDay.filter((h) => h > 0).length
  const targetHours = trackedDayCount * sollstunden
  const overtime = totalHours - targetHours
  const fulfillmentPercent = targetHours === 0 ? 100 : (totalHours / targetHours) * 100

  return { totalHours, targetHours, overtime, fulfillmentPercent }
}

/**
 * Calculate over/undertime considering only days with tracked hours,
 * up to and including today. Also computes how much work is still needed today.
 */
export function calculateOvertimeToDate(
  workedHoursPerDay: number[],
  dates: string[],
  today: string,
  sollstunden: number,
): OvertimeToDate {
  let totalWorked = 0
  let trackedDayCount = 0
  let workedToday = 0

  for (let i = 0; i < dates.length; i++) {
    if (dates[i] > today) break
    const hours = workedHoursPerDay[i]
    if (hours > 0) {
      totalWorked += hours
      trackedDayCount++
    }
    if (dates[i] === today) {
      workedToday = hours
    }
  }

  const targetToDate = trackedDayCount * sollstunden
  const overtime = totalWorked - targetToDate
  const hoursNeededToday = Math.max(0, sollstunden - workedToday)

  return { value: overtime, hoursNeededToday }
}
