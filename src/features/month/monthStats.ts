export interface MonthStats {
  totalHours: number
  targetHours: number
  overtime: number
  fulfillmentPercent: number
}

export interface OvertimeToDate {
  /** Cumulative overtime/undertime for all tracked days up to and including today */
  value: number
  /** Hours worked on the "today" date */
  workedToday: number
  /** Overtime/undertime from days strictly before today */
  priorOvertime: number
}

export function calculateMonthStats(workedHoursPerDay: number[], targetHoursPerDay: number[]): MonthStats {
  const totalHours = workedHoursPerDay.reduce((sum, h) => sum + h, 0)
  // Only count target for days with tracked hours
  const targetHours = workedHoursPerDay.reduce((sum, h, i) => (h > 0 ? sum + (targetHoursPerDay[i] ?? 0) : sum), 0)
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
  targetHoursPerDay: number[],
): OvertimeToDate {
  let totalWorked = 0
  let targetToDate = 0
  let workedToday = 0
  let priorWorked = 0
  let priorTarget = 0

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    if (date === undefined || date > today) break
    const hours = workedHoursPerDay[i] ?? 0
    const target = targetHoursPerDay[i] ?? 0
    if (date === today) {
      workedToday = hours
    } else if (hours > 0) {
      priorWorked += hours
      priorTarget += target
    }
    if (hours > 0) {
      totalWorked += hours
      targetToDate += target
    }
  }

  const value = totalWorked - targetToDate
  const priorOvertime = priorWorked - priorTarget

  return { value, workedToday, priorOvertime }
}
